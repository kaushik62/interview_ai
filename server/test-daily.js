// server/test-daily.js
import dotenv from 'dotenv';
import { query, getOne, initDB } from './db.js';
import { v4 as uuidv4 } from 'uuid';
import { generateMCQQuestions } from './services/gemini.js';

dotenv.config();

async function test() {
  console.log('Testing daily challenge creation...\n');
  
  try {
    // Test Gemini
    console.log('1. Testing Gemini...');
    const questions = await generateMCQQuestions('Daily Challenge', 'general knowledge', 3);
    console.log('✅ Gemini works, generated', questions.length, 'questions');
    
    // Test database
    console.log('\n2. Testing database...');
    await initDB();
    console.log('✅ Database connected');
    
    // Test insert
    console.log('\n3. Testing insert...');
    const today = new Date().toISOString().split('T')[0];
    const testId = uuidv4();
    
    await query(
      `INSERT INTO daily_challenges (id, challenge_date, questions)
       VALUES (?, ?, ?)`,
      [testId, today, JSON.stringify(questions)]
    );
    console.log('✅ Insert successful');
    
    // Test select
    console.log('\n4. Testing select...');
    const result = await getOne('SELECT * FROM daily_challenges WHERE id = ?', [testId]);
    console.log('✅ Select successful:', result ? 'Found' : 'Not found');
    
    console.log('\n🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

test();