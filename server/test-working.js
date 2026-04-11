// server/test-working.js
import { generateMCQQuestions } from './services/gemini.js';

async function test() {
  console.log('\n🚀 Testing Gemini with gemini-flash-latest\n');
  
  try {
    const questions = await generateMCQQuestions(
      'Frontend Developer',
      'React, JavaScript',
      3
    );
    
    console.log('✅ Success! Generated questions:\n');
    questions.forEach((q, i) => {
      console.log(`Q${i + 1}: ${q.question}`);
      console.log(`   Options: ${q.options.join(' | ')}`);
      console.log(`   Correct: ${q.options[q.correct]}`);
      console.log(`   Explanation: ${q.explanation}\n`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();