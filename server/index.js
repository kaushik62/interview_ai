import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDB, testConnection } from './db.js';
import authRoutes from './routes/auth.js';
import pointsRoutes from './routes/points.js';
import mcqRoutes from './routes/mcq.js';
import statsRoute from './routes/stats.js';
import leaderboardRoutes from './routes/leaderboard.js';
import { startAutoRefresh } from './services/leaderboardService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/mcq', mcqRoutes);
app.use('/api/stats', statsRoute);
app.use('/api/leaderboard', leaderboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const startServer = async () => {
  try {
    await testConnection();
    await initDB();
    
    // Start auto-refresh after database is ready
    startAutoRefresh(5);
    
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`📍 http://localhost:${PORT}`);
      console.log(`\n📚 API endpoints:`);
      console.log(`   Auth:`);
      console.log(`   - POST   /api/auth/register`);
      console.log(`   - POST   /api/auth/login`);
      console.log(`   - GET    /api/auth/me`);
      console.log(`   \nMCQ:`);
      console.log(`   - GET    /api/mcq/sessions`);
      console.log(`   - POST   /api/mcq/sessions`);
      console.log(`   - POST   /api/mcq/generate`);
      console.log(`   \nPoints:`);
      console.log(`   - GET    /api/points/my-stats`);
      console.log(`   - GET    /api/points/leaderboard`);
      console.log(`   - GET    /api/points/daily-challenge`);
      console.log(`   - POST   /api/points/daily-challenge/submit`);
      console.log(`   \nLeaderboard:`);
      console.log(`   - GET    /api/leaderboard`);
      console.log(`   - GET    /api/leaderboard/me`);
      console.log(`   - GET    /api/leaderboard/top/:limit`);
      console.log(`   - GET    /api/leaderboard/search`);
      console.log(`   - POST   /api/leaderboard/refresh`);
      console.log(`\n✅ Leaderboard auto-refresh every 5 minutes\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();