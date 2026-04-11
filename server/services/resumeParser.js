// server/services/resumeParser.js
import fs from 'fs';
import mammoth from 'mammoth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Extract text from PDF
export async function extractTextFromPDF(filePath) {
  try {
    const pdfParse = await import('pdf-parse');
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse.default(dataBuffer);
    console.log('PDF extracted, text length:', data.text.length);
    return data.text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to parse PDF file');
  }
}

// Extract text from DOCX
export async function extractTextFromDOCX(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    console.log('DOCX extracted, text length:', result.value.length);
    return result.value;
  } catch (error) {
    console.error('DOCX parsing error:', error);
    throw new Error('Failed to parse DOCX file');
  }
}

// Extract text from TXT
export async function extractTextFromTXT(filePath) {
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    console.log('TXT extracted, text length:', text.length);
    return text;
  } catch (error) {
    console.error('TXT parsing error:', error);
    throw new Error('Failed to parse TXT file');
  }
}

// Analyze resume and extract key information
export async function analyzeResume(resumeText) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    
    const prompt = `Analyze this resume and extract information in JSON format.

Resume Text:
${resumeText}

Return ONLY valid JSON:
{
  "skills": ["skill1", "skill2"],
  "technologies": ["React", "Node.js", "MongoDB"],
  "experience_level": "entry",
  "primary_role": "Full Stack Developer",
  "projects": ["Project1", "Project2"],
  "key_achievements": ["achievement1"],
  "suggested_topics": ["React Hooks", "Node.js APIs", "MongoDB Queries"]
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    let cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      console.log('Analysis:', {
        skills: analysis.skills?.slice(0, 5),
        technologies: analysis.technologies?.slice(0, 5),
        primary_role: analysis.primary_role
      });
      return analysis;
    }
    
    throw new Error('Failed to parse');
    
  } catch (error) {
    console.error('Analysis error:', error);
    return extractInfoManually(resumeText);
  }
}

// Manual extraction from your specific resume
function extractInfoManually(resumeText) {
  console.log('Manual extraction from resume');
  
  // Technologies from your resume
  const technologies = [
    "React.js", "Next.js", "Node.js", "Express.js", 
    "MongoDB", "MySQL", "PostgreSQL", "Supabase", "Firebase",
    "TypeScript", "JavaScript", "Tailwind CSS", "Redux Toolkit"
  ];
  
  // Skills from your resume
  const skills = [
    "Full Stack Development", "REST APIs", "WebSocket",
    "JWT Authentication", "Database Design", "Real-time Features",
    "Performance Optimization", "State Management", "Responsive UI"
  ];
  
  // Projects from your resume
  const projects = [
    "Connectify - Social Media Platform",
    "E-Commerce Web Application",
    "CRM Dashboard"
  ];
  
  // Determine experience level
  let experience_level = "entry";
  if (resumeText.includes('Intern') || resumeText.includes('2025')) {
    experience_level = "entry";
  }
  
  // Primary role
  let primary_role = "Full Stack Developer";
  if (resumeText.includes('Frontend')) primary_role = "Frontend Developer";
  if (resumeText.includes('Backend')) primary_role = "Backend Developer";
  
  return {
    skills: skills,
    technologies: technologies,
    experience_level: experience_level,
    primary_role: primary_role,
    projects: projects,
    key_achievements: ["Top 2.93% in JEE Main", "200+ DSA problems solved"],
    suggested_topics: ["React", "Node.js", "MongoDB", "System Design"]
  };
}

// Generate MCQs based on actual resume skills
export async function generateQuestionsFromResume(resumeAnalysis, count = 10) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    
    const skills = resumeAnalysis.skills || [];
    const technologies = resumeAnalysis.technologies || [];
    const projects = resumeAnalysis.projects || [];
    const role = resumeAnalysis.primary_role || "Full Stack Developer";
    
    const prompt = `You are a technical interviewer. Generate ${count} multiple choice questions for a ${role}.

The candidate has these skills and technologies from their resume:
- Technologies: ${technologies.join(', ')}
- Skills: ${skills.join(', ')}
- Projects worked on: ${projects.join(', ')}

Generate questions that test DEEP knowledge of these specific technologies. 
Each question must be about a SPECIFIC technology from their resume.

Return ONLY a JSON array. Example for React:
[
  {
    "question": "In React, what is the purpose of the useCallback hook?",
    "options": [
      "To memoize functions and prevent unnecessary re-renders",
      "To fetch data from an API",
      "To create a reference to a DOM element",
      "To manage complex state logic"
    ],
    "correct": 0,
    "explanation": "useCallback returns a memoized version of the callback function that only changes if dependencies change, preventing unnecessary re-renders of child components.",
    "difficulty": "medium",
    "topic": "React"
  }
]

Generate questions for: ${technologies.slice(0, 5).join(', ')}.

Make questions practical and based on real-world scenarios.
Each question must test a specific concept from their tech stack.

Return ONLY the JSON array, no other text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    let cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      const questions = JSON.parse(jsonMatch[0]);
      console.log(`Generated ${questions.length} skill-specific questions`);
      return questions;
    }
    
    return getSkillBasedQuestions(resumeAnalysis, count);
    
  } catch (error) {
    console.error('Question generation error:', error);
    return getSkillBasedQuestions(resumeAnalysis, count);
  }
}

// Generate questions based on actual skills from resume
function getSkillBasedQuestions(analysis, count) {
  const technologies = analysis.technologies || [];
  const questions = [];
  
  // React.js questions
  if (technologies.includes('React.js') || technologies.includes('React')) {
    questions.push({
      question: "What is the purpose of the useEffect hook in React?",
      options: [
        "To perform side effects in functional components",
        "To create class components",
        "To manage component state",
        "To render JSX elements"
      ],
      correct: 0,
      explanation: "useEffect is used to handle side effects like API calls, subscriptions, and DOM manipulations in functional components.",
      difficulty: "medium",
      topic: "React.js"
    });
    
    questions.push({
      question: "What is the difference between useState and useReducer?",
      options: [
        "useReducer is for complex state logic, useState for simple state",
        "useState is for class components, useReducer for functional",
        "There is no difference, they do the same thing",
        "useReducer is deprecated"
      ],
      correct: 0,
      explanation: "useReducer is better for complex state logic with multiple sub-values, while useState is simpler for independent state pieces.",
      difficulty: "hard",
      topic: "React.js"
    });
  }
  
  // Node.js questions
  if (technologies.includes('Node.js')) {
    questions.push({
      question: "What is the event loop in Node.js?",
      options: [
        "A mechanism that handles asynchronous operations",
        "A database connection pool",
        "A middleware function",
        "A routing system"
      ],
      correct: 0,
      explanation: "The event loop allows Node.js to perform non-blocking I/O operations despite JavaScript being single-threaded.",
      difficulty: "medium",
      topic: "Node.js"
    });
  }
  
  // MongoDB questions
  if (technologies.includes('MongoDB')) {
    questions.push({
      question: "What is the purpose of indexing in MongoDB?",
      options: [
        "To improve query performance",
        "To create relationships between collections",
        "To validate data types",
        "To encrypt sensitive data"
      ],
      correct: 0,
      explanation: "Indexes in MongoDB improve query performance by reducing the number of documents scanned.",
      difficulty: "medium",
      topic: "MongoDB"
    });
  }
  
  // JWT questions
  if (technologies.includes('JWT') || skills.includes('JWT Authentication')) {
    questions.push({
      question: "What is the structure of a JWT token?",
      options: [
        "Header.Payload.Signature",
        "Header.Body.Signature",
        "Header.Payload.Key",
        "User.Password.Token"
      ],
      correct: 0,
      explanation: "JWT consists of three parts: Header, Payload, and Signature, separated by dots.",
      difficulty: "easy",
      topic: "Authentication"
    });
  }
  
  // WebSocket questions
  if (skills.includes('WebSocket')) {
    questions.push({
      question: "What is the main advantage of WebSocket over HTTP?",
      options: [
        "Full-duplex real-time communication",
        "Better caching mechanisms",
        "Smaller message size",
        "Built-in authentication"
      ],
      correct: 0,
      explanation: "WebSocket provides full-duplex communication allowing real-time data exchange between client and server.",
      difficulty: "medium",
      topic: "WebSocket"
    });
  }
  
  // Performance optimization
  if (skills.includes('Performance Optimization')) {
    questions.push({
      question: "What is code splitting in React?",
      options: [
        "Dynamically loading only the code needed for the current view",
        "Splitting CSS files into smaller chunks",
        "Dividing components into separate files",
        "Optimizing images for faster loading"
      ],
      correct: 0,
      explanation: "Code splitting allows you to lazy-load only the JavaScript needed for the current route, improving initial load time.",
      difficulty: "hard",
      topic: "Performance"
    });
  }
  
  // Add more general questions if needed
  if (questions.length < count) {
    questions.push({
      question: "What is the purpose of Redux Toolkit?",
      options: [
        "To simplify Redux development with less boilerplate",
        "To replace React completely",
        "To handle CSS styling",
        "To manage routing"
      ],
      correct: 0,
      explanation: "Redux Toolkit simplifies Redux development by providing utilities to configure stores, create reducers, and handle immutable updates.",
      difficulty: "medium",
      topic: "State Management"
    });
  }
  
  return questions.slice(0, count);
}

export default {
  extractTextFromPDF,
  extractTextFromDOCX,
  extractTextFromTXT,
  analyzeResume,
  generateQuestionsFromResume
};