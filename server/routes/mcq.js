import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.js';
import { query, getOne, beginTransaction, commitTransaction, rollbackTransaction } from '../db.js';
import { generateMCQQuestions, evaluateAnswers } from '../services/groq.js';

const router = express.Router();

// GET /api/mcq/sessions - Get all MCQ sessions for user
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const sessions = await query(
      `SELECT * FROM mcq_sessions 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [userId]
    );
    
    res.json({ sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/mcq/sessions/:sessionId - Get specific session with questions
router.get('/sessions/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    
    const session = await getOne(
      `SELECT * FROM mcq_sessions WHERE id = ? AND user_id = ?`,
      [sessionId, userId]
    );
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const questions = await query(
      `SELECT * FROM mcq_questions WHERE session_id = ? ORDER BY question_number`,
      [sessionId]
    );
    
    res.json({ session, questions });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/mcq/generate - Generate new MCQ questions
router.post('/generate', authenticate, async (req, res) => {
  try {
    const { jobRole, topic, count = 5 } = req.body;
    
    if (!jobRole) {
      return res.status(400).json({ error: 'Job role is required' });
    }
    
    const questions = await generateMCQQuestions(jobRole, topic, count);
    
    res.json({ questions });
  } catch (error) {
    console.error('Error generating questions:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/mcq/sessions - Create new MCQ session
router.post('/sessions', authenticate, async (req, res) => {
  let connection = null;
  
  try {
    const { jobRole, topic, questions } = req.body;
    const userId = req.user.id;
    
    if (!jobRole || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Job role and questions array are required' });
    }
    
    connection = await beginTransaction();
    
    const sessionId = uuidv4();
    
    // Create session
    await connection.query(
      `INSERT INTO mcq_sessions (id, user_id, job_role, topic, total_questions, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'in_progress', NOW())`,
      [sessionId, userId, jobRole, topic || null, questions.length]
    );
    
    // Insert questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const questionId = uuidv4();
      
      await connection.query(
        `INSERT INTO mcq_questions 
         (id, session_id, question_number, question, options, correct_answer, explanation, difficulty, topic)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [questionId, sessionId, i + 1, q.question, JSON.stringify(q.options), q.correct, q.explanation, q.difficulty, topic]
      );
    }
    
    await commitTransaction(connection);
    
    res.status(201).json({ 
      sessionId, 
      message: 'Session created successfully',
      totalQuestions: questions.length
    });
    
  } catch (error) {
    if (connection) await rollbackTransaction(connection);
    console.error('Error creating session:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/mcq/sessions/:sessionId/submit - Submit answers for a session
router.post('/sessions/:sessionId/submit', authenticate, async (req, res) => {
  let connection = null;
  
  try {
    const { sessionId } = req.params;
    const { answers } = req.body;
    const userId = req.user.id;
    
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Answers array is required' });
    }
    
    connection = await beginTransaction();
    
    // Get session
    const session = await getOne(
      `SELECT * FROM mcq_sessions WHERE id = ? AND user_id = ?`,
      [sessionId, userId]
    );
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    if (session.status === 'completed') {
      return res.status(400).json({ error: 'Session already completed' });
    }
    
    // Get questions
    const questions = await query(
      `SELECT * FROM mcq_questions WHERE session_id = ? ORDER BY question_number`,
      [sessionId]
    );
    
    // Evaluate answers
    let correctCount = 0;
    const questionResults = [];
    
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const userAnswer = answers[i];
      const isCorrect = userAnswer === question.correct_answer;
      
      if (isCorrect) correctCount++;
      
      questionResults.push({
        questionId: question.id,
        isCorrect,
        userAnswer,
        correctAnswer: question.correct_answer
      });
      
      // Update question with user's answer
      await connection.query(
        `UPDATE mcq_questions 
         SET user_answer = ?, is_correct = ?, answered_at = NOW()
         WHERE id = ?`,
        [userAnswer, isCorrect, question.id]
      );
    }
    
    const score = Math.round((correctCount / questions.length) * 100);
    
    // Update session
    await connection.query(
      `UPDATE mcq_sessions 
       SET correct_count = ?, score = ?, status = 'completed', completed_at = NOW()
       WHERE id = ?`,
      [correctCount, score, sessionId]
    );
    
    // Award points
    const pointsEarned = correctCount * 10;
    
    // Add points to user_points
    await connection.query(
      `INSERT INTO user_points (user_id, total_points, current_streak, longest_streak, last_activity_date)
       VALUES (?, ?, 0, 0, CURDATE())
       ON DUPLICATE KEY UPDATE 
       total_points = total_points + ?,
       last_activity_date = CURDATE()`,
      [userId, pointsEarned, pointsEarned]
    );
    
    // Add points history
    await connection.query(
      `INSERT INTO points_history (id, user_id, points, reason, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [uuidv4(), userId, pointsEarned, `Completed MCQ quiz - ${session.job_role} - Score: ${score}%`]
    );
    
    await commitTransaction(connection);
    
    res.json({
      success: true,
      score,
      correctCount,
      totalQuestions: questions.length,
      pointsEarned,
      results: questionResults
    });
    
  } catch (error) {
    if (connection) await rollbackTransaction(connection);
    console.error('Error submitting session:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/mcq/sessions/:sessionId/result - Get session results
router.get('/sessions/:sessionId/result', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    
    const session = await getOne(
      `SELECT * FROM mcq_sessions WHERE id = ? AND user_id = ?`,
      [sessionId, userId]
    );
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const questions = await query(
      `SELECT * FROM mcq_questions WHERE session_id = ? ORDER BY question_number`,
      [sessionId]
    );
    
    // Format results
    const results = questions.map(q => ({
      question: q.question,
      options: JSON.parse(q.options),
      userAnswer: q.user_answer,
      correctAnswer: q.correct_answer,
      isCorrect: q.is_correct,
      explanation: q.explanation
    }));
    
    res.json({
      session,
      results,
      score: session.score,
      correctCount: session.correct_count,
      totalQuestions: session.total_questions
    });
    
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;