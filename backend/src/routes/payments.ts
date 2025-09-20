import express, { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { StripeService } from '../services/stripeService';
import { PrismaClient } from '@prisma/client';
import { createAppError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import { 
  PaymentOrchestratorController,
  validatePaymentCreation,
  validatePayoutCreation,
  validateCurrencyConversion
} from '../controllers/paymentOrchestratorController';

const router = express.Router();
const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
}

// New orchestrator-based routes
router.post('/create', validatePaymentCreation, PaymentOrchestratorController.createPayment);
router.post('/payout', validatePayoutCreation, PaymentOrchestratorController.createPayout);
router.get('/status/:transactionId', PaymentOrchestratorController.getPaymentStatus);
router.get('/methods/:region', PaymentOrchestratorController.getSupportedMethods);
router.post('/convert-currency', validateCurrencyConversion, PaymentOrchestratorController.convertCurrency);
router.get('/analytics', PaymentOrchestratorController.getPaymentAnalytics);

// POST /api/payments/create-intent
router.post('/create-intent', [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('currency').isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  body('appId').exists().withMessage('App ID is required'),
  body('description').optional().isString(),
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { amount, currency, appId, description } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify the app exists and get its details
    const app = await prisma.app.findFirst({
      where: {
        id: appId,
        status: 'PUBLISHED',
      },
    });

    if (!app) {
      return res.status(404).json({
        success: false,
        message: 'App not found or not available'
      });
    }

    // Get or create Stripe customer
    let user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      const stripeCustomer = await StripeService.createCustomer({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId: userId,
        }
      });

      stripeCustomerId = stripeCustomer.id;

      // Update user with Stripe customer ID
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId }
      });
    }

    // Create payment intent
    const paymentIntent = await StripeService.createPaymentIntent({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      customerId: stripeCustomerId,
      description: description || `Purchase of ${app.name}`,
      metadata: {
        userId,
        appId,
        appName: app.name,
      }
    });

    logger.info(`Payment intent created: ${paymentIntent.id} for user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Payment intent created successfully',
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      }
    });
  } catch (error) {
    logger.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/payments/confirm
router.post('/confirm', [
  body('paymentIntentId').exists().withMessage('Payment Intent ID is required'),
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { paymentIntentId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Retrieve the payment intent from Stripe
    const paymentIntent = await StripeService.retrievePaymentIntent(paymentIntentId);

    if (!paymentIntent) {
      return res.status(404).json({
        success: false,
        message: 'Payment intent not found'
      });
    }

    // Verify the payment intent belongs to the user
    if (paymentIntent.metadata.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to payment intent'
      });
    }

    // Check if payment was successful
    if (paymentIntent.status === 'succeeded') {
      // Create purchase record in database
      const appId = paymentIntent.metadata.appId;
      
      // Check if purchase already exists
      const existingPurchase = await prisma.purchase.findFirst({
        where: {
          userId,
          appId,
          stripePaymentIntentId: paymentIntentId,
        }
      });

      if (!existingPurchase) {
        await prisma.purchase.create({
          data: {
            userId,
            appId,
            amount: paymentIntent.amount / 100, // Convert from cents
            currency: paymentIntent.currency.toUpperCase(),
            status: 'COMPLETED',
            stripePaymentIntentId: paymentIntentId,
            purchaseDate: new Date(),
          }
        });

        logger.info(`Purchase recorded for user ${userId}, app ${appId}, payment ${paymentIntentId}`);
      }

      res.status(200).json({
        success: true,
        message: 'Payment confirmed successfully',
        data: {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency.toUpperCase(),
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: `Payment not successful. Status: ${paymentIntent.status}`,
        data: {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
        }
      });
    }
  } catch (error) {
    logger.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/payments/history
router.get('/history', async (req: Request, res: Response) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Get payment history endpoint - implementation pending',
      data: []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/payments/webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      logger.error('Stripe webhook secret not configured');
      return res.status(500).json({
        success: false,
        message: 'Webhook configuration error'
      });
    }

    if (!signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing stripe signature'
      });
    }

    // Construct the event from the webhook payload
    const event = StripeService.constructWebhookEvent(
      req.body,
      signature,
      endpointSecret
    );

    logger.info(`Received Stripe webhook event: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        logger.info(`Payment succeeded: ${paymentIntent.id}`);
        
        // Update purchase status in database
        const userId = paymentIntent.metadata.userId;
        const appId = paymentIntent.metadata.appId;
        
        if (userId && appId) {
          // Check if purchase record exists
          const existingPurchase = await prisma.purchase.findFirst({
            where: {
              userId,
              appId,
              stripePaymentIntentId: paymentIntent.id,
            }
          });

          if (!existingPurchase) {
            // Create purchase record
            await prisma.purchase.create({
              data: {
                userId,
                appId,
                amount: paymentIntent.amount / 100,
                currency: paymentIntent.currency.toUpperCase(),
                status: 'COMPLETED',
                stripePaymentIntentId: paymentIntent.id,
                purchaseDate: new Date(),
              }
            });
            
            logger.info(`Purchase recorded via webhook for user ${userId}, app ${appId}`);
          } else {
            // Update existing purchase
            await prisma.purchase.update({
              where: { id: existingPurchase.id },
              data: { status: 'COMPLETED' }
            });
          }
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        logger.warn(`Payment failed: ${failedPayment.id}`);
        
        // Update purchase status to failed if exists
        const failedUserId = failedPayment.metadata.userId;
        const failedAppId = failedPayment.metadata.appId;
        
        if (failedUserId && failedAppId) {
          await prisma.purchase.updateMany({
            where: {
              userId: failedUserId,
              appId: failedAppId,
              stripePaymentIntentId: failedPayment.id,
            },
            data: { status: 'FAILED' }
          });
        }
        break;

      case 'customer.created':
        const customer = event.data.object;
        logger.info(`Customer created: ${customer.id}`);
        break;

      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    logger.error('Error processing webhook:', error);
    res.status(400).json({
      success: false,
      message: 'Webhook processing failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;