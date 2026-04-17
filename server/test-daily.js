// server/test-daily.js
import dotenv from 'dotenv';
import { query, getOne, initDB } from './db.js';
import { v4 as uuidv4 } from 'uuid';
import { generateMCQQuestions } from './services/groq.js';

dotenv.config();

async function test() {
  console.log('Testing daily challenge creation...\n');
  
  try {
    // Test Grok AI
    console.log('1. Testing Grok AI...');
    const questions = await generateMCQQuestions('Daily Challenge', 'general knowledge', 3);
    console.log('✅ Grok AI works, generated', questions.length, 'questions');
    console.log('Sample question:', JSON.stringify(questions[0], null, 2));
    
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
    
    if (result) {
      console.log('✅ Select successful: Found record');
      console.log('   Date:', result.challenge_date);
      console.log('   Questions count:', JSON.parse(result.questions).length);
    } else {
      console.log('❌ Select failed: Record not found');
    }
    
    // Clean up test data
    console.log('\n5. Cleaning up...');
    await query('DELETE FROM daily_challenges WHERE id = ?', [testId]);
    console.log('✅ Cleanup successful');
    
    console.log('\n🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    
    // Additional error details
    if (error.message.includes('GROQ_API_KEY') || error.message.includes('XAI_API_KEY')) {
      console.error('\n💡 Tip: Make sure your API key is set correctly in .env file');
      console.error('   For Grok: XAI_API_KEY=your_key_here');
      console.error('   For Groq: GROQ_API_KEY=your_key_here');
    }
  }
}

test();