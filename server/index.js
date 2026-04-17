import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDB, testConnection } from './db.js';
import authRoutes from './routes/auth.js';
import pointsRoutes from './routes/points.js';
import mcqRoutes from './routes/mcq.js';  // Add this line

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/mcq', mcqRoutes);  // Add this line

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const startServer = async () => {
  try {
    await testConnection();
    await initDB();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 http://localhost:${PORT}`);
      console.log(`📚 API endpoints:`);
      console.log(`   - POST   /api/auth/register`);
      console.log(`   - POST   /api/auth/login`);
      console.log(`   - GET    /api/auth/me`);
      console.log(`   - GET    /api/mcq/sessions`);
      console.log(`   - POST   /api/mcq/sessions`);
      console.log(`   - POST   /api/mcq/generate`);
      console.log(`   - GET    /api/points/my-stats`);
      console.log(`   - GET    /api/points/leaderboard`);
      console.log(`   - GET    /api/points/daily-challenge`);
      console.log(`   - POST   /api/points/daily-challenge/submit`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();