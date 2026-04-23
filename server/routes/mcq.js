import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.js';
import { query, getOne, beginTransaction, commitTransaction, rollbackTransaction } from '../db.js';
import { generateMCQQuestions, evaluateAnswers } from '../services/groq.js';
import { aiLimiter } from '../middleware/rateLimiter.js';


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
    
    // Parse options for each question
    const formattedQuestions = questions.map(q => ({
      id: q.id,
      question: q.question,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      user_answer: q.user_answer,
      is_correct: q.is_correct
    }));
    
    res.json({ session, questions: formattedQuestions });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/mcq/generate - Generate new MCQ questions
router.post('/generate', authenticate, aiLimiter, async (req, res) => {
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
    
    console.log('Submitting answers for session:', sessionId);
    console.log('Answers:', answers);
    
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
      const userAnswer = answers[i] !== undefined && answers[i] !== null ? answers[i] : null;
      const isCorrect = (userAnswer !== null && userAnswer === question.correct_answer);
      
      if (isCorrect) correctCount++;
      
      // Parse options for text display
      let options = [];
      try {
        options = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;
      } catch (e) {
        options = question.options || [];
      }
      
      questionResults.push({
        questionId: question.id,
        question: question.question,
        isCorrect: isCorrect,
        userAnswer: userAnswer,
        userAnswerText: userAnswer !== null ? options[userAnswer] : 'Not answered',
        correctAnswer: question.correct_answer,
        correctAnswerText: options[question.correct_answer],
        explanation: question.explanation || 'No explanation provided.'
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
    const pointsEarned = correctCount * 10;
    
    console.log(`Score: ${score}%, Correct: ${correctCount}/${questions.length}, Points: ${pointsEarned}`);
    
    // Update session
    await connection.query(
      `UPDATE mcq_sessions 
       SET correct_count = ?, score = ?, status = 'completed', completed_at = NOW()
       WHERE id = ?`,
      [correctCount, score, sessionId]
    );
    
    // Award points
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
    
    // Get updated total points
    const userPoints = await getOne(
      `SELECT total_points FROM user_points WHERE user_id = ?`,
      [userId]
    );
    
    res.json({
      success: true,
      score: score,
      correctCount: correctCount,
      totalQuestions: questions.length,
      pointsEarned: pointsEarned,
      totalPoints: userPoints?.total_points || 0,
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
    
    console.log('Fetching results for session:', sessionId);
    
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
    
    if (questions.length === 0) {
      return res.status(404).json({ error: 'No questions found for this session' });
    }
    
    // Format results with proper answer texts
    const results = questions.map(q => {
      let options = [];
      try {
        options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
      } catch (e) {
        options = q.options || [];
      }
      
      return {
        question: q.question,
        userAnswer: q.user_answer,
        userAnswerText: q.user_answer !== null && q.user_answer !== undefined && options[q.user_answer] 
          ? options[q.user_answer] 
          : 'Not answered',
        correctAnswer: q.correct_answer,
        correctAnswerText: options[q.correct_answer] || 'Unknown',
        isCorrect: q.is_correct,
        explanation: q.explanation || 'No explanation provided.',
        options: options
      };
    });
    
    const correctCount = results.filter(r => r.isCorrect).length;
    const score = Math.round((correctCount / questions.length) * 100);
    const pointsEarned = correctCount * 10;
    
    res.json({
      session: session,
      score: score,
      correctCount: correctCount,
      totalQuestions: questions.length,
      pointsEarned: pointsEarned,
      results: results
    });
    
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/mcq/sessions/:sessionId - Delete a session (FIXED)
router.delete('/sessions/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    
    console.log('Deleting session:', sessionId, 'for user:', userId);
    
    // Verify session belongs to user
    const session = await getOne(
      `SELECT id FROM mcq_sessions WHERE id = ? AND user_id = ?`,
      [sessionId, userId]
    );
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Delete session (cascade will delete related questions due to foreign key)
    await query(`DELETE FROM mcq_sessions WHERE id = ?`, [sessionId]);
    
    console.log('Session deleted successfully:', sessionId);
    res.json({ message: 'Session deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;