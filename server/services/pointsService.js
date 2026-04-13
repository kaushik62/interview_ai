// server/services/pointsService.js
import { query, getOne } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

// Points configuration
const POINTS_CONFIG = {
  QUIZ_COMPLETION: 10,
  PERFECT_SCORE_BONUS: 20,
  STREAK_7_DAYS: 50,
  STREAK_30_DAYS: 200,
  DAILY_CHALLENGE: 25,
  SHARE_RESULT: 5,
  REVIEW_ANSWER: 2
};

export async function ensureUserPointsExists(userId) {
  try {
    const exists = await getOne('SELECT user_id FROM user_points WHERE user_id = ?', [userId]);
    if (!exists) {
      await query(
        `INSERT INTO user_points (user_id, total_points, current_streak, longest_streak, last_activity_date)
         VALUES (?, 0, 0, 0, NULL)`,
        [userId]
      );
      console.log(`Created user_points for user: ${userId}`);
    }
  } catch (error) {
    console.error('Error ensuring user points:', error);
  }
}

// Update user points and streaks
export async function updateUserPointsAndStreak(userId, pointsToAdd = 0, reason = null) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get current user points
    let userPoints = await getOne('SELECT * FROM user_points WHERE user_id = ?', [userId]);
    
    if (!userPoints) {
      // Initialize user points
      await query(
        `INSERT INTO user_points (user_id, total_points, current_streak, longest_streak, last_activity_date)
         VALUES (?, 0, 0, 0, NULL)`,
        [userId]
      );
      userPoints = { total_points: 0, current_streak: 0, longest_streak: 0, last_activity_date: null };
    }
    
    // Check and update streak
    let newStreak = userPoints.current_streak || 0;
    let streakBonus = 0;
    let streakMessage = null;
    
    if (userPoints.last_activity_date) {
      const lastDate = new Date(userPoints.last_activity_date);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        // Consecutive day - increase streak
        newStreak = (userPoints.current_streak || 0) + 1;
        
        // Check for streak milestones
        if (newStreak === 7) {
          streakBonus = POINTS_CONFIG.STREAK_7_DAYS;
          streakMessage = '7-day streak! +50 points! 🎉';
        } else if (newStreak === 30) {
          streakBonus = POINTS_CONFIG.STREAK_30_DAYS;
          streakMessage = '30-day streak! +200 points! 🏆';
        } else if (newStreak === 100) {
          streakBonus = 500;
          streakMessage = '100-day streak! +500 points! 👑';
        }
      } else if (diffDays === 0) {
        // Same day - no change
        newStreak = userPoints.current_streak || 0;
      } else if (diffDays > 1) {
        // Streak broken
        newStreak = 1;
        streakMessage = 'Streak reset! Start a new streak today! 💪';
      }
    } else {
      // First activity
      newStreak = 1;
    }
    
    // Calculate total points to add
    let totalPointsToAdd = pointsToAdd + streakBonus;
    
    // Update points
    const newTotalPoints = (userPoints.total_points || 0) + totalPointsToAdd;
    const newLongestStreak = Math.max(newStreak, userPoints.longest_streak || 0);
    
    // Update user_points table
    await query(
      `UPDATE user_points 
       SET total_points = ?,
           current_streak = ?,
           longest_streak = ?,
           last_activity_date = ?,
           updated_at = NOW()
       WHERE user_id = ?`,
      [newTotalPoints, newStreak, newLongestStreak, today, userId]
    );
    
    // Add points history
    if (totalPointsToAdd > 0) {
      await query(
        `INSERT INTO points_history (id, user_id, points, reason, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [uuidv4(), userId, totalPointsToAdd, reason || (streakBonus ? streakMessage : 'Quiz activity')]
      );
    }
    
    // Update leaderboard cache
    await updateLeaderboardCache();
    
    return {
      pointsAdded: totalPointsToAdd,
      newTotalPoints: newTotalPoints,
      newStreak: newStreak,
      streakBonus: streakBonus,
      streakMessage: streakMessage,
      longestStreak: newLongestStreak
    };
    
  } catch (error) {
    console.error('Error updating points:', error);
    throw error;
  }
}

// Add points for quiz completion
export async function addQuizCompletionPoints(userId, score, totalQuestions) {
  let pointsToAdd = POINTS_CONFIG.QUIZ_COMPLETION;
  let reason = `Completed quiz with ${score}% score`;
  
  // Bonus for perfect score
  if (score === 100) {
    pointsToAdd += POINTS_CONFIG.PERFECT_SCORE_BONUS;
    reason += ' + Perfect score bonus! 🎯';
  }
  
  // Bonus for good score (80%+)
  if (score >= 80 && score < 100) {
    pointsToAdd += 10;
    reason += ' + Excellent performance bonus! 🌟';
  }
  
  return await updateUserPointsAndStreak(userId, pointsToAdd, reason);
}

// Get user points and streak info
export async function getUserPointsInfo(userId) {
  const points = await getOne('SELECT * FROM user_points WHERE user_id = ?', [userId]);
  
  if (!points) {
    return {
      total_points: 0,
      current_streak: 0,
      longest_streak: 0,
      next_streak_milestone: 7,
      points_to_next_milestone: 50
    };
  }
  
  let nextMilestone = 7;
  if (points.current_streak >= 7) nextMilestone = 30;
  if (points.current_streak >= 30) nextMilestone = 100;
  if (points.current_streak >= 100) nextMilestone = null;
  
  let pointsToNextMilestone = 0;
  if (nextMilestone === 7) pointsToNextMilestone = POINTS_CONFIG.STREAK_7_DAYS;
  else if (nextMilestone === 30) pointsToNextMilestone = POINTS_CONFIG.STREAK_30_DAYS;
  else if (nextMilestone === 100) pointsToNextMilestone = 500;
  
  return {
    total_points: points.total_points || 0,
    current_streak: points.current_streak || 0,
    longest_streak: points.longest_streak || 0,
    next_streak_milestone: nextMilestone,
    points_to_next_milestone: pointsToNextMilestone,
    last_activity_date: points.last_activity_date
  };
}

// Get points history
export async function getPointsHistory(userId, limit = 20) {
  return await query(
    `SELECT * FROM points_history 
     WHERE user_id = ? 
     ORDER BY created_at DESC 
     LIMIT ?`,
    [userId, limit]
  );
}

// Update leaderboard cache
export async function updateLeaderboardCache() {
  try {
    // Clear existing cache
    await query('TRUNCATE TABLE leaderboard_cache');
    
    // Insert new leaderboard data with escaped rank column
    await query(`
      INSERT INTO leaderboard_cache (id, user_id, user_name, total_points, current_streak, longest_streak, \`rank\`)
      SELECT 
        UUID(),
        up.user_id,
        u.name,
        up.total_points,
        up.current_streak,
        up.longest_streak,
        ROW_NUMBER() OVER (ORDER BY up.total_points DESC) as rank_num
      FROM user_points up
      JOIN users u ON up.user_id = u.id
      WHERE up.total_points > 0
      ORDER BY up.total_points DESC
      LIMIT 100
    `);
    
    console.log('Leaderboard cache updated');
  } catch (error) {
    console.error('Error updating leaderboard cache:', error);
  }
}

// Get leaderboard
export async function getLeaderboard(limit = 50) {
  const leaderboard = await query(
    `SELECT user_id, user_name, total_points, current_streak, longest_streak, \`rank\`
     FROM leaderboard_cache
     ORDER BY \`rank\` ASC
     LIMIT ?`,
    [limit]
  );
  
  // If cache is empty, update it
  if (leaderboard.length === 0) {
    await updateLeaderboardCache();
    return await getLeaderboard(limit);
  }
  
  return leaderboard;
}

// Get user rank
export async function getUserRank(userId) {
  const rank = await getOne(
    `SELECT \`rank\` FROM leaderboard_cache WHERE user_id = ?`,
    [userId]
  );
  
  return rank?.rank || null;
}

export default {
  updateUserPointsAndStreak,
  addQuizCompletionPoints,
  getUserPointsInfo,
  getPointsHistory,
  getLeaderboard,
  getUserRank,
  ensureUserPointsExists,
  POINTS_CONFIG
};