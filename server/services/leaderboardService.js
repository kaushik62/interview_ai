import { v4 as uuidv4 } from 'uuid';
import { beginTransaction, commitTransaction, rollbackTransaction, query } from '../db.js';

let refreshInterval = null;

// Helper function to refresh leaderboard cache
export const refreshLeaderboardCache = async () => {
  let connection = null;
  
  try {
    console.log('Refreshing leaderboard cache...');
    connection = await beginTransaction();
    
    // Clear existing cache
    await connection.query('TRUNCATE leaderboard_cache');
    
    // Get all users with their points - PostgreSQL uses COALESCE instead of IFNULL
    const result = await connection.query(`
      SELECT 
        users.id,
        users.name,
        COALESCE(user_points.total_points, 0) as total_points,
        COALESCE(user_points.current_streak, 0) as current_streak,
        COALESCE(user_points.longest_streak, 0) as longest_streak
      FROM users
      LEFT JOIN user_points ON users.id = user_points.user_id
      ORDER BY COALESCE(user_points.total_points, 0) DESC, users.name ASC
    `);
    
    // For PostgreSQL, the result is directly the rows (not [rows, fields])
    const userRows = result || [];
    
    console.log(`Found ${userRows.length} users`);
    
    if (userRows.length === 0) {
      await commitTransaction(connection);
      console.log('No users found');
      return true;
    }
    
    // Log all users for debugging
    console.log('Users:', userRows.map(u => ({ name: u.name, points: u.total_points })));
    
    // Assign unique ranks based on total points
    let insertedCount = 0;
    
    for (let i = 0; i < userRows.length; i++) {
      const user = userRows[i];
      
      if (!user || !user.id) continue;
      
      let totalPoints = user.total_points || 0;
      let userName = user.name || 'Unknown User';
      let currentStreak = user.current_streak || 0;
      let longestStreak = user.longest_streak || 0;
      
      // Unique rank: index + 1
      const rank = i + 1;
      
      console.log(`User: ${userName}, Points: ${totalPoints}, Rank: ${rank}`);
      
      // PostgreSQL uses $1, $2 instead of ? and no backticks needed for rank
      await connection.query(
        `INSERT INTO leaderboard_cache 
         (id, user_id, user_name, total_points, current_streak, longest_streak, rank)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [uuidv4(), user.id, userName, totalPoints, currentStreak, longestStreak, rank]
      );
      insertedCount++;
    }
    
    await commitTransaction(connection);
    console.log(`✅ Leaderboard cache refreshed with ${insertedCount} users`);
    return true;
    
  } catch (error) {
    if (connection) {
      await rollbackTransaction(connection);
    }
    console.error('Error refreshing leaderboard:', error.message);
    return false;
  }
};

// Start auto refresh
export const startAutoRefresh = (intervalMinutes = 5) => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  
  // Refresh immediately on start
  console.log('🔄 Running initial leaderboard cache refresh...');
  refreshLeaderboardCache().then(() => {
    console.log('✅ Initial leaderboard cache refresh completed');
  }).catch((error) => {
    console.error('Initial leaderboard cache refresh failed:', error);
  });
  
  // Then refresh every intervalMinutes
  refreshInterval = setInterval(() => {
    console.log('Auto-refreshing leaderboard cache...');
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

export const getLeaderboard = async (page = 1, limit = 20) => {
  try {
    const offset = (page - 1) * limit;
    
    console.log('Fetching leaderboard - Page:', page, 'Limit:', limit);
    
    const result = await query(`
      SELECT 
        user_id,
        user_name,
        total_points,
        current_streak,
        longest_streak,
        rank
      FROM leaderboard_cache
      ORDER BY rank ASC
    `);
    
    console.log('Result type:', typeof result);
    console.log('Is array?', Array.isArray(result));
    
    // For PostgreSQL, result is directly the rows array
    let allLeaderboard = Array.isArray(result) ? result : [];
    
    console.log('Number of users found in cache:', allLeaderboard.length);
    
    // Get total count
    const total = allLeaderboard.length;
    
    // Apply pagination
    const leaderboard = allLeaderboard.slice(offset, offset + limit);
    
    console.log(`Total users: ${total}, Showing page ${page}: ${leaderboard.length} users`);
    
    return {
      leaderboard: leaderboard,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit) || 1,
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

// Get user's rank - PostgreSQL Version
export const getUserRank = async (userId) => {
  try {
    const result = await query(
      `SELECT rank, total_points, current_streak, longest_streak 
       FROM leaderboard_cache 
       WHERE user_id = $1`,
      [userId]
    );
    
    // For PostgreSQL, result is directly the rows array
    const userData = Array.isArray(result) ? result : [];
    
    return userData.length > 0 ? userData[0] : null;
    
  } catch (error) {
    console.error('Error getting user rank:', error);
    return null;
  }
};

// Get top users - PostgreSQL Version
export const getTopUsers = async (limit = 10) => {
  try {
    const result = await query(`
      SELECT 
        user_name,
        total_points,
        current_streak,
        longest_streak,
        rank
      FROM leaderboard_cache
      ORDER BY rank ASC
      LIMIT ${limit}
    `);
    
    // For PostgreSQL, result is directly the rows array
    const topUsers = Array.isArray(result) ? result : [];
    
    return topUsers;
    
  } catch (error) {
    console.error('Error getting top users:', error);
    throw error;
  }
};