import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { 
  getLeaderboard, 
  getUserRank, 
  getTopUsers,
  refreshLeaderboardCache
} from '../services/leaderboardService.js';
import { query } from '../db.js';

const router = express.Router();

// GET /api/leaderboard - Get leaderboard with pagination
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    console.log('Fetching leaderboard for user:', userId);
    
    // Get leaderboard with pagination
    const { leaderboard, pagination } = await getLeaderboard(page, limit);
    
    console.log('Leaderboard length:', leaderboard.length);
    console.log('Leaderboard data:', JSON.stringify(leaderboard, null, 2));
    
    // Get current user's rank
    const userStats = await getUserRank(userId);
    
    // Get top 3
    const top3 = await getTopUsers(3);
    
    // Get nearby users (2 above, 2 below)
    let nearbyUsers = [];
    if (userStats && userStats.rank) {
      const nearbyResult = await query(
        `SELECT 
           user_name,
           total_points,
           \`rank\`
         FROM leaderboard_cache
         WHERE \`rank\` BETWEEN ? AND ?
         ORDER BY \`rank\` ASC`,
        [userStats.rank - 2, userStats.rank + 2]
      );
      nearbyUsers = nearbyResult[0] || [];
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

// POST /api/leaderboard/refresh - Force refresh cache
router.post('/refresh', authenticate, async (req, res) => {
  try {
    await refreshLeaderboardCache();
    res.json({ 
      success: true, 
      message: 'Leaderboard refreshed successfully' 
    });
  } catch (error) {
    console.error('Error refreshing leaderboard:', error);
    res.status(500).json({ error: error.message });
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
    
    const result = await query(
      `SELECT 
         user_id,
         user_name,
         total_points,
         current_streak,
         longest_streak,
         \`rank\`
       FROM leaderboard_cache
       WHERE user_name LIKE ?
       ORDER BY \`rank\` ASC
       LIMIT 20`,
      [`%${searchTerm}%`]
    );
    
    const users = result[0] || [];
    
    res.json({
      success: true,
      users: users
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
    const aheadResult = await query(
      `SELECT COUNT(*) as count FROM leaderboard_cache WHERE \`rank\` < ?`,
      [userStats.rank]
    );
    const behindResult = await query(
      `SELECT COUNT(*) as count FROM leaderboard_cache WHERE \`rank\` > ?`,
      [userStats.rank]
    );
    
    const usersAhead = aheadResult[0]?.[0]?.count || aheadResult[0]?.count || 0;
    const usersBehind = behindResult[0]?.[0]?.count || behindResult[0]?.count || 0;
    
    res.json({
      success: true,
      rank: userStats.rank,
      total_points: userStats.total_points,
      current_streak: userStats.current_streak,
      longest_streak: userStats.longest_streak,
      users_ahead: usersAhead,
      users_behind: usersBehind
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;