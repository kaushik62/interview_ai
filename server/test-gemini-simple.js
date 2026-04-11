// server/test-gemini-simple.js
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

async function testGemini() {
  console.log('\n🔧 Testing Gemini API Models\n');
  
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in .env file');
    return;
  }
  
  const modelsToTry = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-pro-latest",
    "gemini-flash-latest"
  ];
  
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  for (const modelName of modelsToTry) {
    console.log(`\n📡 Testing: ${modelName}...`);
    
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const result = await model.generateContent("Say 'Hello, this model works!'");
      const response = await result.response;
      const text = response.text();
      
      console.log(`✅ ${modelName} is WORKING!`);
      console.log(`   Response: ${text.substring(0, 100)}`);
      console.log(`\n🎉 Use this model in your code!\n`);
      return;
      
    } catch (error) {
      console.log(`❌ ${modelName} failed: ${error.message}`);
    }
  }
  
  console.log('\n❌ No working models found at the moment.');
  console.log('This might be due to high demand. Try again in a few minutes.\n');
}

testGemini();