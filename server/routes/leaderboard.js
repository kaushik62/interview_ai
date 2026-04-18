import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { 
  getLeaderboard, 
  getUserRank, 
  getTopUsers 
} from '../services/leaderboardService.js';
import { query } from '../db.js';

const router = express.Router();

// GET /api/leaderboard - Get leaderboard with pagination
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    // Get leaderboard with pagination
    const { leaderboard, pagination } = await getLeaderboard(page, limit);
    
    // Get current user's rank
    const userStats = await getUserRank(userId);
    
    // Get top 3
    const top3 = await getTopUsers(3);
    
    // Get nearby users (2 above, 2 below)
    let nearbyUsers = [];
    if (userStats && userStats.rank) {
      nearbyUsers = await query(
        `SELECT 
           user_name,
           total_points,
           rank
         FROM leaderboard_cache
         WHERE rank BETWEEN ? AND ?
         ORDER BY rank ASC`,
        [userStats.rank - 2, userStats.rank + 2]
      );
    }
    
    res.json({
      success: true,
      leaderboard: leaderboard,
      top3: top3,
      userRank: userStats ? userStats.rank : "Unranked",
      userStats: userStats,
      nearbyUsers: nearbyUsers,
      pagination: pagination
    });
    
  } catch (error) {
    console.error('Error in leaderboard:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// GET /api/leaderboard/top/:limit
router.get('/top/:limit', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.params.limit) || 10;
    const topUsers = await getTopUsers(limit);
    
    res.json({
      success: true,
      topUsers: topUsers
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/leaderboard/search
router.get('/search', authenticate, async (req, res) => {
  try {
    const searchTerm = req.query.name || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    // Search users
    const users = await query(
      `SELECT 
         user_id,
         user_name,
         total_points,
         current_streak,
         longest_streak,
         rank
       FROM leaderboard_cache
       WHERE user_name LIKE ?
       ORDER BY rank ASC
       LIMIT ? OFFSET ?`,
      [`%${searchTerm}%`, limit, offset]
    );
    
    // Get total count for search
    const totalResult = await query(
      `SELECT COUNT(*) as total 
       FROM leaderboard_cache 
       WHERE user_name LIKE ?`,
      [`%${searchTerm}%`]
    );
    
    res.json({
      success: true,
      users: users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalResult[0].total / limit),
        totalUsers: totalResult[0].total,
        hasNext: page < Math.ceil(totalResult[0].total / limit),
        hasPrev: page > 1
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/leaderboard/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const userStats = await getUserRank(userId);
    
    if (!userStats) {
      return res.json({
        success: true,
        rank: "Unranked",
        total_points: 0,
        message: "Complete challenges to get on leaderboard!"
      });
    }
    
    // Get users ahead and behind
    const usersAhead = await query(
      `SELECT COUNT(*) as count FROM leaderboard_cache WHERE rank < ?`,
      [userStats.rank]
    );
    
    const usersBehind = await query(
      `SELECT COUNT(*) as count FROM leaderboard_cache WHERE rank > ?`,
      [userStats.rank]
    );
    
    res.json({
      success: true,
      rank: userStats.rank,
      total_points: userStats.total_points,
      current_streak: userStats.current_streak,
      longest_streak: userStats.longest_streak,
      users_ahead: usersAhead[0].count,
      users_behind: usersBehind[0].count
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;