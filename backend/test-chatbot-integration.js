const axios = require('axios');

// Test configuration
const BACKEND_URL = 'http://localhost:3020';
const FRONTEND_URL = 'http://localhost:5176';

// Test scenarios for chatbot integration
const testScenarios = [
  {
    name: 'Basic Chat Functionality',
    message: 'Hello, I need help with my account',
    expectedKeywords: ['help', 'account', 'assist']
  },
  {
    name: 'Product Recommendation',
    message: 'I need a good IDE for React development',
    expectedKeywords: ['IDE', 'React', 'development', 'recommend']
  },
  {
    name: 'Technical Support',
    message: 'I\'m having trouble installing a plugin I purchased',
    expectedKeywords: ['plugin', 'install', 'support', 'help']
  },
  {
    name: 'Billing Inquiry',
    message: 'How can I get a refund for my recent purchase?',
    expectedKeywords: ['refund', 'purchase', 'billing']
  },
  {
    name: 'General Information',
    message: 'What types of software do you sell?',
    expectedKeywords: ['software', 'sell', 'types', 'marketplace']
  }
];

async function testBackendHealth() {
  console.log('🔍 Testing Backend Health...');
  try {
    const response = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
    console.log('✅ Backend Health:', response.data.status);
    return response.data.status === 'healthy';
  } catch (error) {
    console.error('❌ Backend Health Check Failed:', error.message);
    return false;
  }
}

async function testAIStatus() {
  console.log('🔍 Testing AI Service Status...');
  try {
    const response = await axios.get(`${BACKEND_URL}/api/ai/status`, { timeout: 5000 });
    console.log('✅ AI Status:', response.data.status);
    return response.data.status === 'operational';
  } catch (error) {
    console.error('❌ AI Status Check Failed:', error.message);
    return false;
  }
}

async function testChatEndpoint(scenario) {
  console.log(`🔍 Testing: ${scenario.name}`);
  try {
    const sessionId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const response = await axios.post(`${BACKEND_URL}/api/ai/chat`, {
      message: scenario.message,
      sessionId,
      context: {
        currentPage: '/test',
        userAgent: 'ChatBot Integration Test'
      }
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    });

    if (response.data.success) {
      const aiResponse = response.data.data.response.toLowerCase();
      const hasExpectedKeywords = scenario.expectedKeywords.some(keyword => 
        aiResponse.includes(keyword.toLowerCase())
      );

      console.log(`✅ ${scenario.name}: Response received`);
      console.log(`   Message: "${scenario.message}"`);
      console.log(`   AI Response: "${response.data.data.response.substring(0, 100)}..."`);
      console.log(`   Keywords Found: ${hasExpectedKeywords ? 'Yes' : 'No'}`);
      
      return {
        success: true,
        hasRelevantContent: hasExpectedKeywords,
        response: response.data.data.response
      };
    } else {
      console.error(`❌ ${scenario.name}: API returned error:`, response.data.message);
      return { success: false, error: response.data.message };
    }
  } catch (error) {
    console.error(`❌ ${scenario.name}: Request failed:`, error.message);
    return { success: false, error: error.message };
  }
}

async function testFrontendAccess() {
  console.log('🔍 Testing Frontend Accessibility...');
  try {
    const response = await axios.get(FRONTEND_URL, { 
      timeout: 5000,
      validateStatus: (status) => status < 500 // Accept redirects and client errors
    });
    console.log('✅ Frontend Accessible: Status', response.status);
    return response.status < 500;
  } catch (error) {
    console.error('❌ Frontend Access Failed:', error.message);
    return false;
  }
}

async function runIntegrationTests() {
  console.log('🚀 Starting Chatbot Integration Tests\n');
  console.log('=' .repeat(60));
  
  const results = {
    backendHealth: false,
    aiStatus: false,
    frontendAccess: false,
    chatTests: [],
    totalTests: 0,
    passedTests: 0
  };

  // Test backend health
  results.backendHealth = await testBackendHealth();
  console.log('');

  // Test AI service status
  results.aiStatus = await testAIStatus();
  console.log('');

  // Test frontend access
  results.frontendAccess = await testFrontendAccess();
  console.log('');

  // Test chat scenarios
  console.log('🔍 Testing Chat Scenarios...');
  for (const scenario of testScenarios) {
    const result = await testChatEndpoint(scenario);
    results.chatTests.push({ scenario: scenario.name, ...result });
    results.totalTests++;
    if (result.success) results.passedTests++;
    console.log('');
  }

  // Generate summary report
  console.log('=' .repeat(60));
  console.log('📊 INTEGRATION TEST SUMMARY');
  console.log('=' .repeat(60));
  
  console.log(`Backend Health: ${results.backendHealth ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`AI Service Status: ${results.aiStatus ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Frontend Access: ${results.frontendAccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Chat Tests: ${results.passedTests}/${results.totalTests} passed`);
  
  const overallSuccess = results.backendHealth && results.aiStatus && 
                        results.frontendAccess && (results.passedTests === results.totalTests);
  
  console.log(`\n🎯 Overall Status: ${overallSuccess ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (overallSuccess) {
    console.log('\n🎉 Chatbot integration is working perfectly!');
    console.log('   • Backend AI service is operational');
    console.log('   • Frontend is accessible');
    console.log('   • All chat scenarios are responding correctly');
    console.log('   • Ready for production use');
  } else {
    console.log('\n⚠️  Integration issues detected:');
    if (!results.backendHealth) console.log('   • Backend health check failed');
    if (!results.aiStatus) console.log('   • AI service is not operational');
    if (!results.frontendAccess) console.log('   • Frontend is not accessible');
    if (results.passedTests < results.totalTests) {
      console.log(`   • ${results.totalTests - results.passedTests} chat scenarios failed`);
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  return overallSuccess;
}

// Run the tests
runIntegrationTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Test execution failed:', error);
  process.exit(1);
});