// server/routes/resume.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.js';
import { query } from '../db.js';
import {
  extractTextFromPDF,
  extractTextFromDOCX,
  extractTextFromTXT,
  analyzeResume,
  generateQuestionsFromResume
} from '../services/resumeParser.js';

const router = express.Router();

// Ensure upload directory exists
const uploadDir = 'uploads/resumes';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.docx', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOCX, and TXT files are allowed'));
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// POST /api/resume/upload - Upload and analyze resume
router.post('/upload', authenticate, upload.single('resume'), async (req, res) => {
  let filePath = null;
  
  try {
    console.log('=== Resume Upload Started ===');
    console.log('User:', req.user?.id);
    
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    
    console.log('File:', req.file.originalname);
    console.log('Extension:', fileExt);
    console.log('Path:', filePath);
    
    // Extract text based on file type
    let resumeText = '';
    try {
      if (fileExt === '.pdf') {
        resumeText = await extractTextFromPDF(filePath);
      } else if (fileExt === '.docx') {
        resumeText = await extractTextFromDOCX(filePath);
      } else {
        resumeText = await extractTextFromTXT(filePath);
      }
    } catch (extractError) {
      console.error('Text extraction error:', extractError);
      throw new Error(`Failed to extract text: ${extractError.message}`);
    }
    
    console.log('Resume text extracted, length:', resumeText?.length || 0);
    
    if (!resumeText || resumeText.trim().length < 50) {
      throw new Error('Could not extract sufficient text from resume. Minimum 50 characters required.');
    }
    
    // Analyze resume
    let analysis;
    try {
      analysis = await analyzeResume(resumeText);
      console.log('Analysis complete:', {
        skills: analysis.skills?.length || 0,
        technologies: analysis.technologies?.length || 0,
        primary_role: analysis.primary_role
      });
    } catch (analysisError) {
      console.error('Analysis error:', analysisError);
      throw new Error(`Failed to analyze resume: ${analysisError.message}`);
    }
    
    // Save to database
    try {
      const resumeId = uuidv4();
      await query(
        `INSERT INTO user_resumes (id, user_id, file_name, file_path, resume_text, analysis, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [resumeId, req.user.id, req.file.originalname, filePath, resumeText.substring(0, 10000), JSON.stringify(analysis)]
      );
      console.log('Saved to database, ID:', resumeId);
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Continue even if DB save fails
    }
    
    // Generate questions based on analysis
    let questions = [];
    try {
      questions = await generateQuestionsFromResume(analysis, 10);
      console.log(`Generated ${questions.length} questions`);
    } catch (questionError) {
      console.error('Question generation error:', questionError);
      // Use fallback questions
      questions = getFallbackQuestions(analysis, 10);
    }
    
    res.json({
      success: true,
      analysis: {
        skills: analysis.skills || [],
        technologies: analysis.technologies || [],
        experience_level: analysis.experience_level || "mid",
        primary_role: analysis.primary_role || "Software Developer",
        projects: analysis.projects || [],
        key_achievements: analysis.key_achievements || [],
        suggested_topics: analysis.suggested_topics || []
      },
      questions: questions.slice(0, 5),
      totalQuestions: questions.length,
      message: 'Resume analyzed successfully!'
    });
    
  } catch (error) {
    console.error('Resume upload error:', error);
    console.error('Error stack:', error.stack);
    
    // Clean up file on error
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log('Cleaned up file:', filePath);
      } catch (unlinkError) {
        console.error('Error cleaning up file:', unlinkError);
      }
    }
    
    res.status(500).json({ 
      error: error.message || 'Failed to process resume',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Fallback questions
function getFallbackQuestions(analysis, count) {
  const technologies = analysis.technologies || ['React', 'Node.js', 'JavaScript'];
  const questions = [];
  
  const questionBank = [
    {
      question: `What is a key feature of ${technologies[0]}?`,
      options: [
        "Component-based architecture",
        "Database management",
        "Server deployment",
        "Styling components"
      ],
      correct: 0,
      explanation: `${technologies[0]} is known for its component-based architecture.`,
      difficulty: "medium",
      topic: technologies[0]
    },
    {
      question: "What is the purpose of useState in React?",
      options: [
        "To manage state in functional components",
        "To create class components",
        "To handle API calls",
        "To style components"
      ],
      correct: 0,
      explanation: "useState is a React Hook that allows you to add state to functional components.",
      difficulty: "easy",
      topic: "React"
    },
    {
      question: "What does JWT stand for?",
      options: [
        "JSON Web Token",
        "JavaScript Web Tool",
        "Java Web Token",
        "JSON Web Technology"
      ],
      correct: 0,
      explanation: "JWT stands for JSON Web Token, used for authentication.",
      difficulty: "easy",
      topic: "Authentication"
    }
  ];
  
  for (let i = 0; i < Math.min(count, questionBank.length); i++) {
    questions.push(questionBank[i]);
  }
  
  return questions;
}

// GET /api/resume/analysis - Get user's resume analysis
router.get('/analysis', authenticate, async (req, res) => {
  try {
    const resume = await query(
      'SELECT * FROM user_resumes WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.user.id]
    );
    
    if (!resume || resume.length === 0) {
      return res.status(404).json({ error: 'No resume found' });
    }
    
    const analysis = JSON.parse(resume[0].analysis);
    
    res.json({
      fileName: resume[0].file_name,
      uploadedAt: resume[0].created_at,
      analysis: analysis
    });
    
  } catch (error) {
    console.error('Error fetching resume analysis:', error);
    res.status(500).json({ error: 'Failed to fetch resume analysis' });
  }
});

// POST /api/resume/generate-quiz - Generate quiz from saved resume
router.post('/generate-quiz', authenticate, async (req, res) => {
  try {
    const { questionCount = 10 } = req.body;
    
    const resume = await query(
      'SELECT * FROM user_resumes WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.user.id]
    );
    
    if (!resume || resume.length === 0) {
      return res.status(404).json({ error: 'No resume found. Please upload your resume first.' });
    }
    
    const analysis = JSON.parse(resume[0].analysis);
    const questions = await generateQuestionsFromResume(analysis, questionCount);
    
    const sessionId = uuidv4();
    await query(
      `INSERT INTO mcq_sessions (id, user_id, job_role, topic, total_questions, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'in_progress', NOW())`,
      [sessionId, req.user.id, analysis.primary_role || 'Software Developer', 'Resume Based Quiz', questions.length]
    );
    
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const questionId = uuidv4();
      await query(
        `INSERT INTO mcq_questions (id, session_id, question_number, question, options, correct_answer, explanation, difficulty, topic)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [questionId, sessionId, i + 1, q.question, JSON.stringify(q.options), q.correct, q.explanation, q.difficulty || 'medium', q.topic || 'General']
      );
    }
    
    const questionsForClient = questions.map((q, index) => ({
      id: `q_${index + 1}`,
      questionNumber: index + 1,
      question: q.question,
      options: q.options
    }));
    
    res.json({
      sessionId,
      questions: questionsForClient,
      totalQuestions: questions.length,
      source: 'Resume-based Quiz',
      analysis: {
        skills: analysis.skills,
        technologies: analysis.technologies,
        primary_role: analysis.primary_role
      }
    });
    
  } catch (error) {
    console.error('Error generating quiz from resume:', error);
    res.status(500).json({ error: 'Failed to generate quiz from resume' });
  }
});

export default router;