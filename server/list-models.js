// server/list-models.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

async function listModels() {
  console.log('\n🔍 Checking available Gemini models\n');
  console.log('API Key:', process.env.GEMINI_API_KEY ? '✅ Present' : '❌ Missing');
  
  if (!process.env.GEMINI_API_KEY) {
    console.error('\n❌ Please add GEMINI_API_KEY to .env file');
    return;
  }
  
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Try to list available models
    console.log('Fetching available models...\n');
    
    // Test with a simple fetch to see what's available
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    
    if (data.models) {
      console.log('✅ Available models:');
      data.models.forEach(model => {
        console.log(`   - ${model.name} (${model.supportedGenerationMethods?.join(', ') || 'unknown'})`);
      });
    } else {
      console.log('No models list available, trying direct API call...');
      
      // Try a simple generate request with a different endpoint
      const testResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Say hello" }] }]
        })
      });
      
      const testData = await testResponse.json();
      console.log('API Response:', testData);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

listModels();