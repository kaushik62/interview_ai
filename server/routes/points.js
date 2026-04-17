import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { generateMCQQuestions } from '../services/groq.js';
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
    
    await conn.query(
      `INSERT INTO user_points (user_id, total_points, current_streak, longest_streak, last_activity_date)
       VALUES (?, ?, 0, 0, CURDATE())
       ON DUPLICATE KEY UPDATE 
       total_points = total_points + ?,
       last_activity_date = CURDATE()`,
      [userId, points, points]
    );
    
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
    
    let userPoints = await getOne(
      `SELECT current_streak, longest_streak, last_activity_date, total_points
       FROM user_points 
       WHERE user_id = ?`,
      [userId]
    );
    
    let newStreak = 1;
    let streakBonus = 0;
    
    if (!userPoints) {
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
          newStreak = (userPoints.current_streak || 0) + 1;
        } else if (lastActivity !== today) {
          newStreak = 1;
        } else {
          newStreak = userPoints.current_streak || 1;
        }
      }
      
      if (newStreak % 5 === 0 && newStreak > 0 && newStreak !== (userPoints.current_streak || 0)) {
        streakBonus = Math.floor(newStreak / 5) * 10;
        await addPoints(userId, streakBonus, `🔥 Streak milestone: ${newStreak} days!`, conn);
      }
      
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

// GET /api/points/my-stats
router.get('/my-stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    let userPoints = await getOne(
      `SELECT total_points, current_streak, longest_streak, last_activity_date 
       FROM user_points 
       WHERE user_id = ?`,
      [userId]
    );
    
    if (!userPoints) {
      await query(
        `INSERT INTO user_points (user_id, total_points, current_streak, longest_streak, last_activity_date) 
         VALUES (?, 0, 0, 0, CURDATE())`,
        [userId]
      );
      userPoints = { total_points: 0, current_streak: 0, longest_streak: 0 };
    }
    
    let rank = "Unranked";
    try {
      const rankResult = await getOne(
        `SELECT COUNT(*) + 1 as rank
         FROM user_points 
         WHERE total_points > ?`,
        [userPoints.total_points]
      );
      rank = rankResult?.rank ? rankResult.rank.toString() : "Unranked";
    } catch (rankError) {
      console.log('Rank calculation error:', rankError.message);
    }
    
    const currentStreak = userPoints?.current_streak || 0;
    const nextStreakMilestone = Math.ceil((currentStreak + 1) / 5) * 5;
    const totalPoints = userPoints?.total_points || 0;
    const pointsToNextMilestone = 50 - (totalPoints % 50);
    
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

// GET /api/points/leaderboard
router.get('/leaderboard', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const leaderboard = await query(
      `SELECT 
         u.id as user_id,
         u.name as user_name,
         COALESCE(up.total_points, 0) as total_points,
         COALESCE(up.current_streak, 0) as current_streak,
         COALESCE(up.longest_streak, 0) as longest_streak
       FROM users u
       LEFT JOIN user_points up ON u.id = up.user_id
       ORDER BY COALESCE(up.total_points, 0) DESC
       LIMIT 100`
    );
    
    const leaderboardWithRank = leaderboard.map((user, index) => ({
      ...user,
      rank: index + 1
    }));
    
    let userRank = "Unranked";
    try {
      const userPoints = await getOne(
        `SELECT COALESCE(total_points, 0) as total_points 
         FROM user_points 
         WHERE user_id = ?`,
        [userId]
      );
      
      if (userPoints && userPoints.total_points > 0) {
        const rankResult = await getOne(
          `SELECT COUNT(*) + 1 as rank
           FROM user_points 
           WHERE total_points > ?`,
          [userPoints.total_points]
        );
        userRank = rankResult?.rank ? rankResult.rank.toString() : "Unranked";
      }
    } catch (rankError) {
      console.error('Error calculating user rank:', rankError.message);
    }
    
    res.json({
      leaderboard: leaderboardWithRank,
      userRank: userRank
    });
    
  } catch (error) {
    console.error('Error in /leaderboard:', error);
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
    
    const existingCompletion = await getOne(
      `SELECT * FROM user_challenge_completions 
       WHERE user_id = ? AND challenge_date = ?`,
      [userId, today]
    );
    
    const hasCompleted = !!existingCompletion;
    
    let dailyChallenge = await getOne(
      `SELECT * FROM daily_challenges WHERE challenge_date = ?`,
      [today]
    );
    
    let questions = [];
    
    if (!dailyChallenge) {
      console.log('No challenge found, generating new one...');
      
      try {
        const groqQuestions = await generateMCQQuestions(
          'Daily Challenge',
          'general knowledge',
          3
        );
        
        const challengeId = uuidv4();
        await query(
          `INSERT INTO daily_challenges (id, challenge_date, questions, created_at)
           VALUES (?, ?, ?, NOW())`,
          [challengeId, today, JSON.stringify(groqQuestions)]
        );
        
        questions = groqQuestions;
        dailyChallenge = { id: challengeId };
      } catch (error) {
        console.error('Error generating questions:', error);
        // Return fallback questions
        return res.json({
          challengeId: 'fallback',
          challengeDate: today,
          questions: [
            { id: 0, question: "What is the capital of France?", options: ["London", "Berlin", "Paris", "Madrid"] },
            { id: 1, question: "What is 2 + 2?", options: ["3", "4", "5", "6"] },
            { id: 2, question: "Which is a programming language?", options: ["HTML", "CSS", "JavaScript", "Photoshop"] }
          ],
          totalQuestions: 3,
          hasCompleted: false
        });
      }
    } else {
      questions = typeof dailyChallenge.questions === 'string' 
        ? JSON.parse(dailyChallenge.questions) 
        : dailyChallenge.questions;
    }
    
    const formattedQuestions = questions.map((q, index) => ({
      id: index,
      question: q.question,
      options: q.options
    }));
    
    res.json({
      challengeId: dailyChallenge.id,
      challengeDate: today,
      questions: formattedQuestions,
      totalQuestions: formattedQuestions.length,
      hasCompleted: hasCompleted
    });
    
  } catch (error) {
    console.error('❌ Error in daily-challenge:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/points/daily-challenge/submit
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
    
    let correctCount = 0;
    const results = [];
    
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const userAnswer = parseInt(answers[i]);
      const correctAnswer = parseInt(question.correct);
      
      const isCorrect = userAnswer === correctAnswer;
      
      if (isCorrect) {
        correctCount++;
      }
      
      results.push({
        questionId: i + 1,
        question: question.question,
        isCorrect: isCorrect,
        correctAnswer: correctAnswer,
        userAnswer: userAnswer,
        correctAnswerText: question.options[correctAnswer],
        userAnswerText: question.options[userAnswer] || 'No answer',
        explanation: question.explanation || 'No explanation provided.'
      });
    }
    
    const score = Math.round((correctCount / questions.length) * 100);
    const pointsEarned = correctCount * 10;
    
    console.log(`Score: ${score}%, Points: ${pointsEarned}`);
    
    connection = await beginTransaction();
    
    const completionId = uuidv4();
    await connection.query(
      `INSERT INTO user_challenge_completions 
       (id, user_id, challenge_id, challenge_date, score, points_earned, answers, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [completionId, userId, dailyChallenge.id, today, score, pointsEarned, JSON.stringify(answers)]
    );
    
    if (pointsEarned > 0) {
      await addPoints(userId, pointsEarned, `Daily challenge completed! Score: ${score}% (${correctCount}/${questions.length} correct)`, connection);
    }
    
    const { newStreak, streakBonus } = await updateStreak(userId, connection);
    
    await commitTransaction(connection);
    
    const userPoints = await getOne(
      `SELECT total_points FROM user_points WHERE user_id = ?`,
      [userId]
    );
    
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
    console.error('❌ Submit error:', error);
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
    
    await addPoints(userId, pointsToAdd, reason);
    const { newStreak, streakBonus } = await updateStreak(userId);
    
    const userPoints = await getOne(
      `SELECT total_points FROM user_points WHERE user_id = ?`,
      [userId]
    );
    
    res.json({
      success: true,
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

export default router;