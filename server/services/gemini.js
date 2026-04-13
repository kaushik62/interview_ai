// server/services/gemini.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Check if API key exists
if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set in .env file');
  console.error('Please add: GEMINI_API_KEY=your_api_key_here');
}



const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Generate MCQ questions using Gemini
export async function generateMCQQuestions(jobRole, topic, count) {
  try {
    // Use gemini-flash-latest which is working
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    
    const prompt = `Generate ${count} multiple choice questions for a ${jobRole} position about ${topic}.

Return ONLY a valid JSON array. No markdown, no extra text.

Example format:
[
  {
    "question": "What is React?",
    "options": ["JavaScript library", "Programming language", "Database", "CSS framework"],
    "correct": 0,
    "explanation": "React is a JavaScript library for building user interfaces.",
    "difficulty": "easy"
  }
]

Requirements:
- Questions must be relevant to ${jobRole}
- Each question must have exactly 4 options
- "correct" is the index (0, 1, 2, or 3) of the right answer
- Include a clear explanation

Generate ${count} unique questions now.`;

    console.log(`🤖 Calling Gemini API with model: gemini-flash-latest for ${count} questions...`);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('📥 Gemini response received, length:', text.length);
    
    // Clean up the response - remove markdown code blocks
    let cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Find JSON array in the response
    const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON array found in response');
      console.log('Raw response:', text.substring(0, 500));
      throw new Error('Gemini returned invalid response format - no JSON array found');
    }
    
    const questions = JSON.parse(jsonMatch[0]);
    
    // Validate questions
    if (!questions || questions.length === 0) {
      throw new Error('Gemini returned empty questions array');
    }
    
    // Validate each question has required fields
    const validQuestions = questions.filter(q => 
      q.question && 
      q.options && 
      q.options.length === 4 &&
      typeof q.correct === 'number' &&
      q.correct >= 0 && 
      q.correct <= 3
    );
    
    if (validQuestions.length === 0) {
      throw new Error('Gemini returned invalid question format');
    }
    
    console.log(`✅ Successfully generated ${validQuestions.length} questions from Gemini`);
    return validQuestions.slice(0, count);
    
  } catch (error) {
    console.error('Gemini API error:', error.message);
    throw new Error(`Gemini API failed: ${error.message}`);
  }
}

// Evaluate answers (for MCQ)
export function evaluateAnswers(questions, userAnswers) {
  let score = 0;
  const results = [];
  
  for (let i = 0; i < questions.length; i++) {
    const isCorrect = userAnswers[i] === questions[i].correct;
    if (isCorrect) score++;
    
    results.push({
      question: questions[i].question,
      userAnswer: questions[i].options[userAnswers[i]],
      correctAnswer: questions[i].options[questions[i].correct],
      isCorrect: isCorrect,
      explanation: questions[i].explanation || 'No explanation provided.'
    });
  }
  
  const percentage = Math.round((score / questions.length) * 100);
  
  let message;
  if (percentage >= 80) message = "Excellent! 🎉 You're well prepared!";
  else if (percentage >= 60) message = "Good job! 👍 Keep practicing to improve!";
  else message = "Keep practicing! 💪 Review the explanations below.";
  
  return {
    score: percentage,
    correctCount: score,
    totalQuestions: questions.length,
    results: results,
    message: message
  };
}

export default {
  generateMCQQuestions,
  evaluateAnswers
};