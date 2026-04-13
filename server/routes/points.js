// server/routes/points.js - PURE GEMINI (NO FALLBACK)
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { generateMCQQuestions } from '../services/gemini.js';

const router = express.Router();

// GET /api/points/daily-challenge - Pure Gemini (no fallback)
router.get('/daily-challenge', authenticate, async (req, res) => {
  try {
    console.log('🚀 Generating daily challenge with Gemini for user:', req.user.id);
    
    // Generate questions from Gemini only
    const geminiQuestions = await generateMCQQuestions(
      'Daily Challenge', 
      'general knowledge including technology, science, history, and pop culture', 
      5
    );
    
    if (!geminiQuestions || geminiQuestions.length === 0) {
      throw new Error('Gemini failed to generate questions');
    }
    
    console.log('✅ Gemini generated', geminiQuestions.length, 'questions');
    
    // Format questions for frontend (without correct answers)
    const questions = geminiQuestions.map((q, index) => ({
      id: index + 1,
      question: q.question,
      options: q.options
    }));
    
    res.json({
      challengeId: `gemini-${Date.now()}`,
      questions: questions,
      totalQuestions: questions.length,
      hasCompleted: false
    });
    
  } catch (error) {
    console.error('❌ Gemini error:', error.message);
    // Return error - NO FALLBACK
    res.status(503).json({ 
      error: 'Unable to generate daily challenge',
      message: error.message,
      suggestion: 'Gemini API quota exceeded or invalid key. Please try again later.'
    });
  }
});

// POST /api/points/daily-challenge/submit
router.post('/daily-challenge/submit', authenticate, async (req, res) => {
  try {
    const { answers } = req.body;
    
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Answers array is required' });
    }
    
    // Get today's challenge from database (you'll need to store correct answers)
    // For now, we need to get the correct answers from the stored challenge
    const today = new Date().toISOString().split('T')[0];
    
    // This part needs to retrieve the correct answers from your database
    // Since we don't store correct answers in the session, we need to fetch them
    
    res.json({
      success: true,
      score: 0,
      correctCount: 0,
      totalQuestions: answers.length,
      pointsEarned: 25,
      message: `Daily challenge completed! You earned 25 points! 🎉`,
      results: []
    });
    
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/points/my-stats
router.get('/my-stats', authenticate, (req, res) => {
  res.json({
    total_points: 150,
    current_streak: 3,
    longest_streak: 7,
    next_streak_milestone: 7,
    points_to_next_milestone: 50,
    rank: "42"
  });
});

// GET /api/points/leaderboard
router.get('/leaderboard', authenticate, (req, res) => {
  res.json({
    leaderboard: [
      { user_name: "Alice", total_points: 500, current_streak: 10, rank: 1 },
      { user_name: "Bob", total_points: 450, current_streak: 8, rank: 2 },
      { user_name: "Charlie", total_points: 400, current_streak: 5, rank: 3 }
    ],
    userRank: "42"
  });
});

// POST /api/points/add-quiz-points
router.post('/add-quiz-points', authenticate, (req, res) => {
  res.json({
    pointsAdded: 10,
    newTotalPoints: 160,
    newStreak: 4,
    streakBonus: 0,
    longestStreak: 7
  });
});

export default router;