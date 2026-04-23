import axios from 'axios';

async function testRateLimit() {
  console.log('Testing rate limiting...\n');
  
  const url = 'http://localhost:5000/api/auth/login';
  
  for (let i = 1; i <= 7; i++) {
    try {
      const response = await axios.post(url, {
        email: 'test@example.com',
        password: 'wrongpassword'
      });
      console.log(`Attempt ${i}: ✅ Success (Status: ${response.status})`);
    } catch (error) {
      if (error.response?.status === 429) {
        console.log(`Attempt ${i}: 🚫 Rate Limited - ${error.response.data.error}`);
      } else if (error.response?.status === 401) {
        console.log(`Attempt ${i}: ❌ Invalid credentials (Status: 401)`);
      } else {
        console.log(`Attempt ${i}: ❌ Error - ${error.message}`);
      }
    }
    
    // Wait 1 second between attempts
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testRateLimit();