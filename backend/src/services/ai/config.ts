import { GoogleAuth } from 'google-auth-library';
import { GoogleGenerativeAI } from '@google/generative-ai';

// AI Service Configuration
export interface AIConfig {
  projectId: string;
  location: string;
  geminiApiKey: string;
  vertexAIEndpoint: string;
}

// Initialize Google Cloud AI Configuration
export const aiConfig: AIConfig = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'rapid-tech-store',
  location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  vertexAIEndpoint: process.env.VERTEX_AI_ENDPOINT || 'us-central1-aiplatform.googleapis.com'
};

// Google Auth for Vertex AI
export const googleAuth = new GoogleAuth({
  scopes: [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/bigquery'
  ],
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

// Gemini AI Client (only initialize if API key is available)
export const geminiAI = aiConfig.geminiApiKey ? new GoogleGenerativeAI(aiConfig.geminiApiKey) : null;

// Validate AI Configuration
export const validateAIConfig = (): boolean => {
  const requiredEnvVars = [
    'GOOGLE_CLOUD_PROJECT_ID',
    'GEMINI_API_KEY'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`Missing AI configuration: ${missingVars.join(', ')}`);
    return false;
  }

  return true;
};

// AI Service Status
export const getAIServiceStatus = async () => {
  try {
    const isConfigValid = validateAIConfig();
    const authClient = await googleAuth.getClient();
    
    return {
      configValid: isConfigValid,
      authenticated: !!authClient,
      services: {
        gemini: !!aiConfig.geminiApiKey,
        vertexAI: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
        bigQuery: !!process.env.GOOGLE_CLOUD_PROJECT_ID
      }
    };
  } catch (error) {
    console.error('AI Service Status Check Failed:', error);
    return {
      configValid: false,
      authenticated: false,
      services: {
        gemini: false,
        vertexAI: false,
        bigQuery: false
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};