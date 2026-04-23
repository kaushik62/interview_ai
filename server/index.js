import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDB, testConnection } from './db.js';
import { authLimiter, generalLimiter } from './middleware/rateLimiter.js';
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

// Apply rate limiting and routes together
app.use('/api/auth', authLimiter, authRoutes);           // 5 attempts per 15 min
app.use('/api/points', pointsRoutes);                    // Rate limiting inside routes
app.use('/api/mcq', mcqRoutes);                          // Rate limiting inside routes
app.use('/api/stats', statsRoute);
app.use('/api/leaderboard', leaderboardRoutes);

// Health check (no rate limit)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const startServer = async () => {
  try {
    await testConnection();
    await initDB();
    startAutoRefresh(5);
    
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`📍 http://localhost:${PORT}`);
      console.log(`\n📚 API endpoints with rate limiting:`);
      console.log(`   Auth: (5 attempts per 15 min - IP based)`);
      console.log(`   - POST   /api/auth/register`);
      console.log(`   - POST   /api/auth/login`);
      console.log(`   - GET    /api/auth/me`);
      console.log(`   \n✅ Rate limiting enabled (IP-based)`);
      console.log(`✅ Leaderboard auto-refresh every 5 minutes\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();