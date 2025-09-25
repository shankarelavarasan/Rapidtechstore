import express, { Request, Response } from 'express';
import { CustomerSupportAgent, ChatMessage, SupportContext } from '../services/ai/customerSupportAgent';
import { getAIServiceStatus } from '../services/ai/config';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting for AI endpoints
const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many AI requests from this IP, please try again later.'
});

// Initialize Customer Support Agent
const supportAgent = new CustomerSupportAgent();

// Chat session storage (in production, use Redis or database)
const chatSessions = new Map<string, ChatMessage[]>();

/**
 * @route GET /api/ai/status
 * @desc Get AI services status
 * @access Public
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = await getAIServiceStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get AI service status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/ai/chat
 * @desc Send message to customer support AI
 * @access Public (with rate limiting)
 */
router.post('/chat', aiRateLimit, async (req: Request, res: Response) => {
  try {
    const { message, sessionId, context } = req.body;

    if (!message || !sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Message and sessionId are required'
      });
    }

    // Get or create chat session
    let chatHistory = chatSessions.get(sessionId) || [];

    // Build support context
    const user = (req as any).user; // Optional authentication
    const supportContext: SupportContext = {
      userId: user?.id,
      userType: user ? (user.role === 'vendor' ? 'vendor' : 'customer') : 'guest',
      currentPage: context?.currentPage,
      recentActions: context?.recentActions,
      orderHistory: context?.orderHistory
    };

    // Add user message to history
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
      sessionId
    };
    chatHistory.push(userMessage);

    // Generate AI response
    const aiResponse = await supportAgent.chat(message, supportContext, chatHistory);

    // Add AI response to history
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date(),
      sessionId
    };
    chatHistory.push(assistantMessage);

    // Update session (keep last 20 messages)
    chatHistory = chatHistory.slice(-20);
    chatSessions.set(sessionId, chatHistory);

    // Categorize the query for analytics
    const queryCategory = await supportAgent.categorizeQuery(message);

    res.json({
      success: true,
      data: {
        response: aiResponse,
        sessionId,
        category: queryCategory,
        timestamp: assistantMessage.timestamp
      }
    });

  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process chat message',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/ai/recommendations
 * @desc Get product recommendations based on user query
 * @access Public (with rate limiting)
 */
router.post('/recommendations', aiRateLimit, async (req: Request, res: Response) => {
  try {
    const { query, context } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query is required'
      });
    }

    const user = (req as any).user; // Optional authentication
    const supportContext: SupportContext = {
      userId: user?.id,
      userType: user ? (user.role === 'vendor' ? 'vendor' : 'customer') : 'guest',
      currentPage: context?.currentPage,
      recentActions: context?.recentActions
    };

    const recommendations = await supportAgent.generateProductRecommendations(query, supportContext);

    res.json({
      success: true,
      data: {
        recommendations,
        query,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('AI Recommendations Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate recommendations',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/ai/chat/history/:sessionId
 * @desc Get chat history for a session
 * @access Public
 */
router.get('/chat/history/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const chatHistory = chatSessions.get(sessionId) || [];

    res.json({
      success: true,
      data: {
        sessionId,
        messages: chatHistory,
        messageCount: chatHistory.length
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get chat history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/ai/feedback
 * @desc Submit feedback for AI responses
 * @access Public
 */
router.post('/feedback', async (req: Request, res: Response) => {
  try {
    const { sessionId, messageId, helpful, rating, comment } = req.body;

    if (!sessionId || !messageId || typeof helpful !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: sessionId, messageId, helpful'
      });
    }

    // In a production environment, you would save this to a database
    // For now, we'll just log it and return success
    console.log('Feedback received:', {
      sessionId,
      messageId,
      helpful,
      rating,
      comment,
      timestamp: new Date().toISOString()
    });

    // TODO: Save to database using Prisma
    // await prisma.chatFeedback.create({
    //   data: {
    //     sessionId,
    //     messageId,
    //     helpful,
    //     rating,
    //     comment,
    //     timestamp: new Date()
    //   }
    // });

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        sessionId,
        messageId,
        helpful,
        rating,
        comment
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route DELETE /api/ai/chat/session/:sessionId
 * @desc Clear chat session
 * @access Public
 */
router.delete('/chat/session/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    chatSessions.delete(sessionId);

    res.json({
      success: true,
      message: 'Chat session cleared',
      data: { sessionId }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to clear chat session',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;