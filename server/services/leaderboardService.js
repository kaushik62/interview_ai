import { v4 as uuidv4 } from 'uuid';
import { beginTransaction, commitTransaction, rollbackTransaction, query } from '../db.js';

// Auto refresh every 5 minutes
let refreshInterval = null;

// Helper function to refresh leaderboard cache
export const refreshLeaderboardCache = async () => {
  let connection = null;
  
  try {
    connection = await beginTransaction();
    
    // Clear existing cache
    await connection.query('TRUNCATE leaderboard_cache');
    
    // Get all users with their points
    const users = await connection.query(`
      SELECT 
        users.id,
        users.name,
        user_points.total_points,
        user_points.current_streak,
        user_points.longest_streak
      FROM users
      LEFT JOIN user_points ON users.id = user_points.user_id
      ORDER BY user_points.total_points DESC
    `);
    
    if (users.length === 0) {
      await commitTransaction(connection);
      console.log('No users found for leaderboard cache');
      return true;
    }
    
    // Assign ranks based on total points
    let currentRank = 1;
    let previousPoints = null;
    let skipCount = 0;
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      // Handle null points
      let totalPoints = user.total_points;
      if (totalPoints === null) {
        totalPoints = 0;
      }
      
      // If points are different from previous user, update rank
      if (previousPoints === null || totalPoints !== previousPoints) {
        currentRank = currentRank + skipCount;
        skipCount = 0;
      } else {
        skipCount++;
      }
      
      // Insert into cache
      await connection.query(
        `INSERT INTO leaderboard_cache 
         (id, user_id, user_name, total_points, current_streak, longest_streak, \`rank\`)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), user.id, user.name, totalPoints, 
         user.current_streak, user.longest_streak, currentRank]
      );
      
      previousPoints = totalPoints;
    }
    
    await commitTransaction(connection);
    console.log(`Leaderboard cache refreshed with ${users.length} users`);
    return true;
    
  } catch (error) {
    if (connection) {
      await rollbackTransaction(connection);
    }
    console.error('Error refreshing leaderboard:', error.message);
    return false;
  }
};

// Start auto refresh (call this once when server starts)
export const startAutoRefresh = (intervalMinutes = 5) => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  
  // Refresh immediately on start
  refreshLeaderboardCache();
  
  // Then refresh every intervalMinutes
  refreshInterval = setInterval(() => {
    console.log(`Auto-refreshing leaderboard cache...`);
    refreshLeaderboardCache();
  }, intervalMinutes * 60 * 1000);
  
  console.log(`Leaderboard auto-refresh started (every ${intervalMinutes} minutes)`);
};

// Stop auto refresh
export const stopAutoRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
    console.log('Leaderboard auto-refresh stopped');
  }
};

// Get leaderboard with pagination
export const getLeaderboard = async (page = 1, limit = 20) => {
  try {
    const offset = (page - 1) * limit;
    
    // Get paginated leaderboard
    const leaderboard = await query(
      `SELECT 
         user_id,
         user_name,
         total_points,
         current_streak,
         longest_streak,
         rank
       FROM leaderboard_cache
       ORDER BY rank ASC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    
    // Get total count
    const totalResult = await query(`SELECT COUNT(*) as total FROM leaderboard_cache`);
    const total = totalResult[0].total;
    
    return {
      leaderboard: leaderboard,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        limit: limit,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
    
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    throw error;
  }
};

// Get user's rank
export const getUserRank = async (userId) => {
  try {
    const result = await query(
      `SELECT rank, total_points, current_streak, longest_streak 
       FROM leaderboard_cache 
       WHERE user_id = ?`,
      [userId]
    );
    
    if (result.length > 0) {
      return result[0];
    }
    return null;
    
  } catch (error) {
    console.error('Error getting user rank:', error);
    throw error;
  }
};

// Get top users
export const getTopUsers = async (limit = 10) => {
  try {
    const topUsers = await query(
      `SELECT 
         user_name,
         total_points,
         current_streak,
         longest_streak,
         rank
       FROM leaderboard_cache
       ORDER BY rank ASC
       LIMIT ?`,
      [limit]
    );
    
    return topUsers;
    
  } catch (error) {
    console.error('Error getting top users:', error);
    throw error;
  }
};