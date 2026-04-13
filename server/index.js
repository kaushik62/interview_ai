// server/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDB, testConnection, ensureDatabase } from './db.js';
import authRoutes from './routes/auth.js';
import mcqRoutes from './routes/mcq.js';
import statsRoutes from './routes/stats.js';
import resumeRoutes from './routes/resume.js';
import pointsRoutes from './routes/points.js';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Routes - Only MCQ routes now
app.use('/api/auth', authRoutes);
app.use('/api/mcq', mcqRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/points', pointsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Server is running'
  });
});

// Test endpoint for auth
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// 404 handler for undefined routes
app.use((req, res) => {
  console.log(`404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ 
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.url}`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message 
  });
});

// Start server
async function startServer() {
  try {
    // Ensure database exists
    await ensureDatabase();
    
    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Could not connect to database');
    }
    
    // Initialize tables
    await initDB();
    
    // Start listening
    app.listen(PORT, () => {
      console.log(`\n✅ Server started successfully!`);
      console.log(`📡 Server running on: http://localhost:${PORT}`);
      console.log(`\n📋 Available endpoints:`);
      console.log(`   POST   http://localhost:${PORT}/api/auth/register`);
      console.log(`   POST   http://localhost:${PORT}/api/auth/login`);
      console.log(`   GET    http://localhost:${PORT}/health`);
      console.log(`   GET    http://localhost:${PORT}/api/test`);
      console.log(`\n📝 MCQ Endpoints:`);
      console.log(`   POST   http://localhost:${PORT}/api/mcq/session`);
      console.log(`   GET    http://localhost:${PORT}/api/mcq/session/:id`);
      console.log(`   POST   http://localhost:${PORT}/api/mcq/submit/:id`);
      console.log(`   GET    http://localhost:${PORT}/api/mcq/sessions`);
      console.log(`\n🔒 Protected endpoints require Bearer token`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error('Please check:');
    console.error('1. MySQL is running');
    console.error('2. Database credentials in .env are correct');
    console.error('3. GEMINI_API_KEY is set in .env');
    process.exit(1);
  }
}

startServer();