/**
 * CUSTOMER SUPPORT AI INTEGRATION TEST
 * End-to-end validation of AI customer support functionality
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3020';

// Test scenarios for customer support AI
const testScenarios = [
  {
    name: 'Product Recommendation Query',
    endpoint: '/api/ai/chat',
    data: {
      message: 'I need a project management tool for my team of 10 developers',
      context: 'product_recommendation'
    }
  },
  {
    name: 'Technical Support Query',
    endpoint: '/api/ai/support',
    data: {
      query: 'How do I integrate your API with my React application?',
      category: 'technical_support'
    }
  },
  {
    name: 'Billing Support Query',
    endpoint: '/api/ai/support',
    data: {
      query: 'I was charged twice for my subscription, can you help?',
      category: 'billing_support'
    }
  },
  {
    name: 'General Chat Query',
    endpoint: '/api/ai/chat',
    data: {
      message: 'What are the benefits of using AI tools in software development?',
      context: 'general_inquiry'
    }
  },
  {
    name: 'Product Comparison Query',
    endpoint: '/api/ai/support',
    data: {
      query: 'What is the difference between your Pro and Enterprise plans?',
      category: 'product_information'
    }
  }
];

async function runTest(scenario) {
  try {
    console.log(`\n🧪 Testing: ${scenario.name}`);
    console.log(`📍 Endpoint: ${scenario.endpoint}`);
    
    const response = await axios.post(`${BASE_URL}${scenario.endpoint}`, scenario.data, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    console.log(`✅ Status: ${response.status}`);
    console.log(`📝 Response:`, JSON.stringify(response.data, null, 2));
    
    // Validate response structure
    if (scenario.endpoint === '/api/ai/chat') {
      if (response.data.id && response.data.message && response.data.timestamp) {
        console.log(`✅ Chat response structure is valid`);
      } else {
        console.log(`❌ Chat response structure is invalid`);
      }
    } else if (scenario.endpoint === '/api/ai/support') {
      if (response.data.id && response.data.answer && response.data.confidence && response.data.suggestedActions) {
        console.log(`✅ Support response structure is valid`);
      } else {
        console.log(`❌ Support response structure is invalid`);
      }
    }
    
    return { success: true, scenario: scenario.name, response: response.data };
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return { success: false, scenario: scenario.name, error: error.message };
  }
}

async function validateAIServices() {
  console.log('🚀 Starting Customer Support AI Integration Tests\n');
  
  // First, check if server is healthy
  try {
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('🏥 Health Check:', healthResponse.data);
    
    if (healthResponse.data.status !== 'healthy') {
      console.log('❌ Server is not healthy, aborting tests');
      return;
    }
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    return;
  }

  // Check AI services status
  try {
    const statusResponse = await axios.get(`${BASE_URL}/api/ai/status`);
    console.log('🤖 AI Services Status:', statusResponse.data);
  } catch (error) {
    console.log('❌ AI status check failed:', error.message);
  }

  // Run all test scenarios
  const results = [];
  for (const scenario of testScenarios) {
    const result = await runTest(scenario);
    results.push(result);
    
    // Wait between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n📊 TEST SUMMARY');
  console.log('================');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Successful tests: ${successful}`);
  console.log(`❌ Failed tests: ${failed}`);
  console.log(`📈 Success rate: ${(successful / results.length * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.scenario}: ${r.error}`);
    });
  }
  
  console.log('\n🎯 Customer Support AI Integration Test Complete!');
}

// Run the validation
validateAIServices().catch(console.error);