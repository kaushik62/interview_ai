// server/routes/points.js - Fixed Version (No dailyChallengeService)
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { generateMCQQuestions } from '../services/gemini.js';
import { query, getOne, beginTransaction, commitTransaction, rollbackTransaction } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Helper function to add points
async function addPoints(userId, points, reason, connection = null) {
  const useTransaction = !connection;
  let conn = connection;
  
  try {
    if (useTransaction) {
      conn = await beginTransaction();
    }
    
    // Update user points
    await conn.query(
      `INSERT INTO user_points (user_id, total_points, current_streak, longest_streak)
       VALUES (?, ?, 0, 0)
       ON DUPLICATE KEY UPDATE 
       total_points = total_points + ?`,
      [userId, points, points]
    );
    
    // Add to points history
    await conn.query(
      `INSERT INTO points_history (id, user_id, points, reason, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [uuidv4(), userId, points, reason]
    );
    
    if (useTransaction) {
      await commitTransaction(conn);
    }
    
    return true;
  } catch (error) {
    if (useTransaction && conn) {
      await rollbackTransaction(conn);
    }
    console.error('Error adding points:', error);
    throw error;
  }
}

// Helper function to update streak
async function updateStreak(userId, connection = null) {
  const today = new Date().toISOString().split('T')[0];
  const useTransaction = !connection;
  let conn = connection;
  
  try {
    if (useTransaction) {
      conn = await beginTransaction();
    }
    
    const userPoints = await getOne(
      `SELECT current_streak, longest_streak, last_activity_date 
       FROM user_points 
       WHERE user_id = ?`,
      [userId]
    );
    
    let newStreak = 1;
    let streakBonus = 0;
    
    if (!userPoints) {
      // Create new record with streak = 1
      await conn.query(
        `INSERT INTO user_points (user_id, current_streak, longest_streak, last_activity_date, total_points)
         VALUES (?, 1, 1, ?, 0)`,
        [userId, today]
      );
    } else {
      const lastActivity = userPoints.last_activity_date;
      
      if (lastActivity) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (lastActivity === yesterdayStr) {
          // Consecutive day
          newStreak = (userPoints.current_streak || 0) + 1;
        } else if (lastActivity !== today) {
          // Not consecutive and not today, reset streak
          newStreak = 1;
        } else {
          // Already updated today
          newStreak = userPoints.current_streak || 1;
        }
      }
      
      // Bonus points for streak milestones
      if (newStreak % 5 === 0 && newStreak > 0 && newStreak !== userPoints.current_streak) {
        streakBonus = Math.floor(newStreak / 5) * 10;
        await addPoints(userId, streakBonus, `🔥 Streak milestone: ${newStreak} days!`, conn);
      }
      
      // Update streak
      await conn.query(
        `UPDATE user_points 
         SET current_streak = ?,
             longest_streak = GREATEST(COALESCE(longest_streak, 0), ?),
             last_activity_date = ?
         WHERE user_id = ?`,
        [newStreak, newStreak, today, userId]
      );
    }
    
    if (useTransaction) {
      await commitTransaction(conn);
    }
    
    return { newStreak, streakBonus };
  } catch (error) {
    if (useTransaction && conn) {
      await rollbackTransaction(conn);
    }
    console.error('Error updating streak:', error);
    throw error;
  }
}

// In your points.js, update the /my-stats endpoint
// GET /api/points/my-stats
router.get('/my-stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log('Fetching points stats for user:', userId);
    
    // First, ensure user_points record exists
    const existingPoints = await getOne(
      `SELECT * FROM user_points WHERE user_id = ?`,
      [userId]
    );
    
    if (!existingPoints) {
      console.log('No points record found, creating default...');
      // Create default record
      await query(
        `INSERT INTO user_points (user_id, total_points, current_streak, longest_streak, last_activity_date) 
         VALUES (?, 0, 0, 0, CURDATE())`,
        [userId]
      );
      
      // Return default stats
      return res.json({
        total_points: 0,
        current_streak: 0,
        longest_streak: 0,
        next_streak_milestone: 5,
        points_to_next_milestone: 50,
        rank: "Unranked"
      });
    }
    
    // Get user points and streak info
    const userPoints = await getOne(
      `SELECT total_points, current_streak, longest_streak, last_activity_date 
       FROM user_points 
       WHERE user_id = ?`,
      [userId]
    );
    
    // Calculate user's rank - handle case when no other users exist
    let rankResult;
    try {
      rankResult = await getOne(
        `SELECT COUNT(*) + 1 as rank
         FROM user_points 
         WHERE total_points > (
           SELECT COALESCE(total_points, 0) FROM user_points WHERE user_id = ?
         )`,
        [userId]
      );
    } catch (rankError) {
      console.log('Rank calculation error, using default rank:', rankError.message);
      rankResult = { rank: 1 };
    }
    
    // Calculate next streak milestone (every 5 days)
    const currentStreak = userPoints?.current_streak || 0;
    const nextStreakMilestone = Math.ceil((currentStreak + 1) / 5) * 5;
    
    // Calculate points to next milestone (every 50 points)
    const totalPoints = userPoints?.total_points || 0;
    const pointsToNextMilestone = 50 - (totalPoints % 50);
    
    const rank = rankResult?.rank ? rankResult.rank.toString() : "Unranked";
    
    res.json({
      total_points: totalPoints,
      current_streak: currentStreak,
      longest_streak: userPoints?.longest_streak || 0,
      next_streak_milestone: nextStreakMilestone,
      points_to_next_milestone: pointsToNextMilestone === 50 ? 50 : pointsToNextMilestone,
      rank: rank
    });
    
  } catch (error) {
    console.error('Error in /my-stats:', error);
    console.error('Error details:', error.message);
    // Return default stats instead of error
    res.json({
      total_points: 0,
      current_streak: 0,
      longest_streak: 0,
      next_streak_milestone: 5,
      points_to_next_milestone: 50,
      rank: "Unranked"
    });
  }
});


// GET /api/points/leaderboard - FIXED VERSION
router.get('/leaderboard', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log('Fetching leaderboard for user:', userId);
    
    // Get leaderboard (top 100 users) - FIXED SQL for MySQL
    const leaderboard = await query(
      `SELECT 
         u.name as user_name,
         u.id as user_id,
         COALESCE(up.total_points, 0) as total_points,
         COALESCE(up.current_streak, 0) as current_streak,
         COALESCE(up.longest_streak, 0) as longest_streak
       FROM users u
       LEFT JOIN user_points up ON u.id = up.user_id
       ORDER BY COALESCE(up.total_points, 0) DESC
       LIMIT 100`
    );
    
    // Add rank to each user
    const leaderboardWithRank = leaderboard.map((user, index) => ({
      ...user,
      rank: index + 1
    }));
    
    // Get current user's rank
    let userRank = "Unranked";
    try {
      const userPoints = await getOne(
        `SELECT COALESCE(total_points, 0) as total_points 
         FROM user_points 
         WHERE user_id = ?`,
        [userId]
      );
      
      if (userPoints && userPoints.total_points > 0) {
        // Count users with more points
        const rankResult = await getOne(
          `SELECT COUNT(*) + 1 as rank
           FROM user_points 
           WHERE total_points > ?`,
          [userPoints.total_points]
        );
        userRank = rankResult?.rank?.toString() || "Unranked";
      }
    } catch (rankError) {
      console.error('Error calculating user rank:', rankError.message);
      userRank = "Unranked";
    }
    
    console.log(`Leaderboard fetched: ${leaderboardWithRank.length} users, User rank: ${userRank}`);
    
    res.json({
      leaderboard: leaderboardWithRank,
      userRank: userRank
    });
    
  } catch (error) {
    console.error('Error in /leaderboard:', error);
    console.error('Error details:', error.message);
    // Return empty leaderboard instead of error
    res.json({
      leaderboard: [],
      userRank: "Unranked"
    });
  }
});


// GET /api/points/daily-challenge
router.get('/daily-challenge', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    
    console.log('🚀 Getting daily challenge for user:', userId);
    
    // Check if user has already completed today's challenge
    const existingCompletion = await getOne(
      `SELECT * FROM user_challenge_completions 
       WHERE user_id = ? AND challenge_date = ?`,
      [userId, today]
    );
    
    const hasCompleted = !!existingCompletion;
    
    // Get today's challenge from database or create new one
    let dailyChallenge = await getOne(
      `SELECT * FROM daily_challenges WHERE challenge_date = ?`,
      [today]
    );
    
    let questions = [];
    
    if (!dailyChallenge) {
      console.log('No challenge found, generating new one from Gemini...');
      
      // Generate new challenge with Gemini
      const geminiQuestions = await generateMCQQuestions(
        'Daily Challenge',
        'general knowledge including technology, science, history, and pop culture',
        5
      );
      
      if (!geminiQuestions || geminiQuestions.length === 0) {
        throw new Error('Gemini failed to generate questions');
      }
      
      console.log('✅ Gemini generated', geminiQuestions.length, 'questions');
      console.log('Sample question:', JSON.stringify(geminiQuestions[0], null, 2));
      
      // Store challenge in database
      const challengeId = uuidv4();
      await query(
        `INSERT INTO daily_challenges (id, challenge_date, questions)
         VALUES (?, ?, ?)`,
        [challengeId, today, JSON.stringify(geminiQuestions)]
      );
      
      questions = geminiQuestions;
    } else {
      questions = typeof dailyChallenge.questions === 'string' 
        ? JSON.parse(dailyChallenge.questions) 
        : dailyChallenge.questions;
      console.log('📋 Using existing challenge from database');
    }
    
    // Format questions for frontend (without correct answers)
    const formattedQuestions = questions.map((q, index) => ({
      id: index + 1,
      question: q.question,
      options: q.options
    }));
    
    res.json({
      challengeId: `daily-${today}`,
      questions: formattedQuestions,
      totalQuestions: formattedQuestions.length,
      hasCompleted: hasCompleted
    });
    
  } catch (error) {
    console.error('❌ Error in daily-challenge:', error.message);
    res.status(503).json({ 
      error: 'Unable to generate daily challenge',
      message: error.message,
      suggestion: 'Please try again later.'
    });
  }
});

// POST /api/points/daily-challenge/submit - FIXED VERSION
router.post('/daily-challenge/submit', authenticate, async (req, res) => {
  let connection = null;
  
  try {
    const userId = req.user.id;
    const { answers } = req.body;
    const today = new Date().toISOString().split('T')[0];
    
    console.log('📝 Submitting daily challenge for user:', userId);
    console.log('Answers received:', answers);
    
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Answers array is required' });
    }
    
    // Check if already completed today's challenge
    const existingCompletion = await getOne(
      `SELECT * FROM user_challenge_completions 
       WHERE user_id = ? AND challenge_date = ?`,
      [userId, today]
    );
    
    if (existingCompletion) {
      return res.status(400).json({ 
        error: 'You have already completed today\'s challenge',
        alreadyCompleted: true 
      });
    }
    
    // Get today's challenge
    const dailyChallenge = await getOne(
      `SELECT * FROM daily_challenges WHERE challenge_date = ?`,
      [today]
    );
    
    if (!dailyChallenge) {
      return res.status(404).json({ error: 'No challenge found for today' });
    }
    
    const questions = typeof dailyChallenge.questions === 'string'
      ? JSON.parse(dailyChallenge.questions)
      : dailyChallenge.questions;
    
    console.log('Questions from DB:', questions.length);
    console.log('First question structure:', JSON.stringify(questions[0], null, 2));
    
    // Calculate score - using 'correct' field from Gemini
    let correctCount = 0;
    const results = [];
    
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const userAnswer = answers[i];
      
      // Gemini uses 'correct' field (0-based index)
      const correctAnswer = question.correct;
      
      console.log(`\nQuestion ${i + 1}: ${question.question}`);
      console.log(`  User answer: ${userAnswer} (${typeof userAnswer})`);
      console.log(`  Correct answer: ${correctAnswer} (${typeof correctAnswer})`);
      
      // Compare as numbers
      const isCorrect = parseInt(userAnswer) === parseInt(correctAnswer);
      
      if (isCorrect) {
        correctCount++;
        console.log(`  ✓ CORRECT`);
      } else {
        console.log(`  ✗ WRONG - User chose: ${question.options[userAnswer]}, Correct: ${question.options[correctAnswer]}`);
      }
      
      results.push({
        questionId: i + 1,
        isCorrect: isCorrect,
        correctAnswer: correctAnswer,
        userAnswer: userAnswer,
        correctAnswerText: question.options[correctAnswer],
        userAnswerText: question.options[userAnswer],
        explanation: question.explanation || 'No explanation provided.'
      });
    }
    
    const score = Math.round((correctCount / questions.length) * 100);
    const pointsEarned = correctCount * 10; // 10 points per correct answer
    
    console.log(`\n📊 FINAL RESULTS: ${correctCount}/${questions.length} correct (${score}%)`);
    console.log(`💰 Points earned: ${pointsEarned}`);
    
    // Start transaction
    connection = await beginTransaction();
    
    // Record completion
    await connection.query(
      `INSERT INTO user_challenge_completions (id, user_id, challenge_date, score, completed_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [uuidv4(), userId, today, score]
    );
    
    // Award points
    if (pointsEarned > 0) {
      await addPoints(userId, pointsEarned, `Daily challenge completed! Score: ${score}% (${correctCount}/${questions.length} correct)`, connection);
    }
    
    // Update streak
    const { newStreak, streakBonus } = await updateStreak(userId, connection);
    
    await commitTransaction(connection);
    
    // Get updated total points
    const userPoints = await getOne(
      `SELECT total_points FROM user_points WHERE user_id = ?`,
      [userId]
    );
    
    // Return success response
    res.json({
      success: true,
      score: score,
      correctCount: correctCount,
      totalQuestions: questions.length,
      pointsEarned: pointsEarned,
      streakBonus: streakBonus,
      totalPoints: userPoints?.total_points || 0,
      currentStreak: newStreak,
      message: `Daily challenge completed! You earned ${pointsEarned} points! ${streakBonus > 0 ? `+${streakBonus} streak bonus! ` : ''}🎉`,
      results: results
    });
    
  } catch (error) {
    if (connection) {
      await rollbackTransaction(connection);
    }
    console.error('Submit error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/points/add-quiz-points
router.post('/add-quiz-points', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { points, quizType, score, totalQuestions } = req.body;
    
    const pointsToAdd = points || 10;
    const reason = `Completed ${quizType || 'quiz'} - Score: ${score || 0}/${totalQuestions || 0}`;
    
    // Add points
    await addPoints(userId, pointsToAdd, reason);
    
    // Update streak
    const { newStreak, streakBonus } = await updateStreak(userId);
    
    // Get updated total points
    const userPoints = await getOne(
      `SELECT total_points FROM user_points WHERE user_id = ?`,
      [userId]
    );
    
    res.json({
      pointsAdded: pointsToAdd,
      streakBonus: streakBonus,
      newTotalPoints: userPoints?.total_points || 0,
      newStreak: newStreak,
      longestStreak: userPoints?.longest_streak || 0,
      message: `You earned ${pointsToAdd} points! ${streakBonus > 0 ? `+${streakBonus} streak bonus! ` : ''}`
    });
    
  } catch (error) {
    console.error('Error adding quiz points:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/points/history
router.get('/history', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    
    const history = await query(
      `SELECT points, reason, created_at
       FROM points_history
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, limit]
    );
    
    res.json({
      history: history,
      total: history.length
    });
    
  } catch (error) {
    console.error('Error fetching points history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add to points.js for debugging
router.get('/debug/check-user-points', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if user_points exists
    const userPoints = await getOne(
      'SELECT * FROM user_points WHERE user_id = ?',
      [userId]
    );
    
    // Check if points_history exists
    const pointsHistory = await query(
      'SELECT * FROM points_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
      [userId]
    );
    
    res.json({
      user_id: userId,
      has_user_points: !!userPoints,
      user_points: userPoints,
      points_history_count: pointsHistory.length,
      points_history: pointsHistory
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/points/debug/leaderboard-data - Debug endpoint
router.get('/debug/leaderboard-data', authenticate, async (req, res) => {
  try {
    // Check user_points table
    const allUserPoints = await query(
      `SELECT u.name, u.id, up.total_points, up.current_streak, up.longest_streak
       FROM users u
       LEFT JOIN user_points up ON u.id = up.user_id
       ORDER BY COALESCE(up.total_points, 0) DESC
       LIMIT 20`
    );
    
    // Check total count
    const totalUsers = await getOne(`SELECT COUNT(*) as count FROM users`);
    const totalWithPoints = await getOne(`SELECT COUNT(*) as count FROM user_points WHERE total_points > 0`);
    
    res.json({
      leaderboard_data: allUserPoints,
      statistics: {
        total_users: totalUsers?.count || 0,
        users_with_points: totalWithPoints?.count || 0,
        has_data: allUserPoints.length > 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint - Remove in production
router.get('/debug/today-challenge', authenticate, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const challenge = await getOne(
      `SELECT * FROM daily_challenges WHERE challenge_date = ?`,
      [today]
    );
    
    if (challenge) {
      const questions = JSON.parse(challenge.questions);
      res.json({
        date: today,
        total_questions: questions.length,
        questions: questions.map((q, idx) => ({
          index: idx,
          question: q.question,
          options: q.options,
          correct_answer: q.correct, // Gemini uses 'correct' field
          has_correct_field: 'correct' in q,
          all_keys: Object.keys(q)
        }))
      });
    } else {
      res.json({ message: 'No challenge found for today', date: today });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;