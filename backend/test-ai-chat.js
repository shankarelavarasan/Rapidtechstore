const axios = require('axios');

async function testAIChat() {
  try {
    console.log('Testing AI Chat endpoint...');
    
    const response = await axios.post('http://localhost:3000/api/ai/chat', {
      message: 'Hello, I need help with my account',
      sessionId: 'test-session-123',
      context: {
        currentPage: '/account'
      }
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('✅ AI Chat Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ AI Chat Error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.message);
    } else {
      console.error('Error:', error.message);
    }
  }
}

async function testAIStatus() {
  try {
    console.log('Testing AI Status endpoint...');
    
    const response = await axios.get('http://localhost:3000/api/ai/status', {
      timeout: 5000
    });

    console.log('✅ AI Status Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ AI Status Error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

async function runTests() {
  await testAIStatus();
  console.log('\n' + '='.repeat(50) + '\n');
  await testAIChat();
}

runTests();