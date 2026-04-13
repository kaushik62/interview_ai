// server/services/dailyChallengeService.js
import { query, getOne } from '../db.js';
import { v4 as uuidv4 } from 'uuid';
import { generateMCQQuestions } from './gemini.js';

// Generate daily challenge questions using Gemini
export async function generateDailyChallengeQuestions() {
  console.log('🤖 Generating daily challenge questions from Gemini...');
  
  // Generate 5 unique questions for daily challenge
  const questions = await generateMCQQuestions(
    'Daily Challenge', 
    'mixed topics including technology, programming, science, history, and general knowledge', 
    5
  );
  
  if (!questions || questions.length === 0) {
    throw new Error('Failed to generate daily challenge questions from Gemini');
  }
  
  // Format questions for storage
  const formattedQuestions = questions.map((q, index) => ({
    id: index + 1,
    question: q.question,
    options: q.options,
    correct: q.correct,
    explanation: q.explanation || 'No explanation provided.'
  }));
  
  console.log(`✅ Generated ${formattedQuestions.length} daily challenge questions`);
  return formattedQuestions;
}

// Get today's daily challenge (creates if doesn't exist)
export async function getTodaysChallenge() {
  const today = new Date().toISOString().split('T')[0];
  
  // Check if challenge already exists for today
  let challenge = await getOne(
    'SELECT * FROM daily_challenges WHERE challenge_date = ?',
    [today]
  );
  
  if (!challenge) {
    console.log('No challenge found for today, generating new one from Gemini...');
    
    try {
      // Generate new questions using Gemini
      const questions = await generateDailyChallengeQuestions();
      
      const challengeId = uuidv4();
      await query(
        `INSERT INTO daily_challenges (id, challenge_date, questions, created_at)
         VALUES (?, ?, ?, NOW())`,
        [challengeId, today, JSON.stringify(questions)]
      );
      
      challenge = { id: challengeId, questions: questions };
      console.log('✅ New daily challenge created for:', today);
    } catch (error) {
      console.error('Failed to generate daily challenge:', error);
      // Return a simple default challenge as fallback
      const defaultQuestions = [
        {
          id: 1,
          question: "What is the capital of France?",
          options: ["London", "Berlin", "Paris", "Madrid"],
          correct: 2,
          explanation: "Paris is the capital city of France."
        },
        {
          id: 2,
          question: "What is 2 + 2?",
          options: ["3", "4", "5", "6"],
          correct: 1,
          explanation: "2 + 2 equals 4."
        },
        {
          id: 3,
          question: "What does HTML stand for?",
          options: [
            "Hyper Text Markup Language",
            "High Tech Modern Language",
            "Hyper Transfer Markup Language",
            "Home Tool Markup Language"
          ],
          correct: 0,
          explanation: "HTML stands for Hyper Text Markup Language."
        }
      ];
      
      const challengeId = uuidv4();
      await query(
        `INSERT INTO daily_challenges (id, challenge_date, questions, created_at)
         VALUES (?, ?, ?, NOW())`,
        [challengeId, today, JSON.stringify(defaultQuestions)]
      );
      
      challenge = { id: challengeId, questions: defaultQuestions };
      console.log('⚠️ Using fallback daily challenge for:', today);
    }
  } else {
    challenge.questions = JSON.parse(challenge.questions);
    console.log('📋 Using existing daily challenge for:', today);
  }
  
  return challenge;
}

// Check if user completed today's challenge
export async function hasCompletedChallenge(userId) {
  const today = new Date().toISOString().split('T')[0];
  
  const completion = await getOne(
    'SELECT * FROM user_challenge_completions WHERE user_id = ? AND challenge_date = ?',
    [userId, today]
  );
  
  return !!completion;
}

// Submit daily challenge answers
export async function submitDailyChallenge(userId, answers) {
  const today = new Date().toISOString().split('T')[0];
  
  // Check if already completed
  const alreadyCompleted = await hasCompletedChallenge(userId);
  if (alreadyCompleted) {
    throw new Error('Daily challenge already completed today');
  }
  
  // Get today's challenge
  const challenge = await getTodaysChallenge();
  const questions = challenge.questions;
  
  // Calculate score
  let correctCount = 0;
  const results = [];
  
  for (let i = 0; i < questions.length; i++) {
    const isCorrect = answers[i] === questions[i].correct;
    if (isCorrect) correctCount++;
    
    results.push({
      question: questions[i].question,
      userAnswer: questions[i].options[answers[i]],
      correctAnswer: questions[i].options[questions[i].correct],
      isCorrect: isCorrect,
      explanation: questions[i].explanation
    });
  }
  
  const score = Math.round((correctCount / questions.length) * 100);
  
  // Save completion
  const completionId = uuidv4();
  await query(
    `INSERT INTO user_challenge_completions (id, user_id, challenge_date, score, completed_at)
     VALUES (?, ?, ?, ?, NOW())`,
    [completionId, userId, today, score]
  );
  
  return {
    score: score,
    correctCount: correctCount,
    totalQuestions: questions.length,
    results: results,
    pointsEarned: 25,
    message: score === 100 ? "Perfect score! 🎉" : "Great effort! Keep practicing! 💪"
  };
}

// Get user's challenge history
export async function getUserChallengeHistory(userId, limit = 30) {
  return await query(
    `SELECT challenge_date, score, completed_at
     FROM user_challenge_completions
     WHERE user_id = ?
     ORDER BY challenge_date DESC
     LIMIT ?`,
    [userId, limit]
  );
}

export default {
  generateDailyChallengeQuestions,
  getTodaysChallenge,
  hasCompletedChallenge,
  submitDailyChallenge,
  getUserChallengeHistory
};