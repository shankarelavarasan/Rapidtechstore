/**
 * SIMPLIFIED AI SERVER FOR RAPID TECH STORE
 * Focuses on AI functionality while bypassing TypeScript compilation issues
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3020;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3001',
    process.env.CONSOLE_URL || 'http://localhost:3002',
    'https://rapidtech.store',
    'https://console.rapidtech.store',
  ],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', async (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    services: {
      ai: 'available'
    }
  });
});

// Basic AI endpoints
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({
        error: 'Message is required'
      });
    }

    // Simulate AI response for now
    const response = {
      success: true,
      data: {
        response: `Hello! I'm RapidBot, your AI assistant for Rapid Tech Store. You said: "${message}". I'm here to help you with software recommendations, technical support, account issues, and more. What specific assistance do you need today?`,
        timestamp: new Date().toISOString(),
        sessionId: req.body.sessionId || 'default-session'
      }
    };

    res.json(response);
  } catch (error) {
    console.error('AI Chat error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

app.post('/api/ai/support', async (req, res) => {
  try {
    const { query, category } = req.body;
    
    if (!query) {
      return res.status(400).json({
        error: 'Query is required'
      });
    }

    // Simulate customer support AI response
    const response = {
      id: Date.now().toString(),
      answer: `Customer Support AI: Regarding "${query}" - I'm here to help! Let me provide you with relevant information and assistance.`,
      category: category || 'general',
      confidence: 0.95,
      timestamp: new Date().toISOString(),
      suggestedActions: [
        'Check our documentation',
        'Contact technical support',
        'Browse related products'
      ]
    };

    res.json(response);
  } catch (error) {
    console.error('AI Support error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

app.get('/api/ai/status', (req, res) => {
  res.json({
    status: 'operational',
    services: {
      chat: 'available',
      support: 'available',
      recommendations: 'available'
    },
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Rapid Tech Store AI Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 AI Chat: http://localhost:${PORT}/api/ai/chat`);
  console.log(`🎧 AI Support: http://localhost:${PORT}/api/ai/support`);
});

module.exports = app;