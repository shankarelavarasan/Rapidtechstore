import express, { Request, Response } from 'express';
import { createWebhookHandler } from '../services/webhookHandler';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const router = express.Router();
const prisma = new PrismaClient();
const webhookHandler = createWebhookHandler();

// Stripe webhook endpoint
router.post('/stripe', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    
    if (!signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing stripe signature'
      });
    }

    // The webhook handler handles the response directly
    await webhookHandler.handleStripeWebhook(req, res);
    return;
    
  } catch (error) {
    logger.error('Stripe webhook error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
    return;
  }
});

// Razorpay webhook endpoint
router.post('/razorpay', express.json(), async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    
    if (!signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing razorpay signature'
      });
    }

    // The webhook handler handles the response directly
    await webhookHandler.handleRazorpayWebhook(req, res);
    return;
    
  } catch (error) {
    logger.error('Razorpay webhook error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
    return;
  }
});

// Payoneer webhook endpoint
router.post('/payoneer', express.json(), async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-payoneer-signature'] as string;
    
    if (!signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing payoneer signature'
      });
    }

    // The webhook handler handles the response directly
    await webhookHandler.handlePayoneerWebhook(req, res);
    return;
    
  } catch (error) {
    logger.error('Payoneer webhook error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
    return;
  }
});

// Wise webhook endpoint
router.post('/wise', express.json(), async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-wise-signature'] as string;
    
    if (!signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing wise signature'
      });
    }

    // The webhook handler handles the response directly
    await webhookHandler.handleWiseWebhook(req, res);
    return;
    
  } catch (error) {
    logger.error('Wise webhook error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
    return;
  }
});

// Generic webhook status endpoint
router.get('/status', async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.query;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required'
      });
    }

    const payment = await prisma.unifiedPayment.findFirst({
      where: {
        OR: [
          { transactionId: transactionId as string },
          { gatewayTransactionId: transactionId as string }
        ]
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: {
        transactionId: payment.transactionId,
        gatewayTransactionId: payment.gatewayTransactionId,
        status: payment.status,
        gateway: payment.gateway,
        amount: payment.amount,
        currency: payment.currency,
        type: payment.paymentType,
        updatedAt: payment.updatedAt
      }
    });
    return;

  } catch (error) {
    logger.error('Webhook status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
    return;
  }
});

/**
 * Process webhook events and update database
 */
async function processWebhookEvent(gateway: string, event: any) {
  try {
    logger.info(`Processing ${gateway} webhook event:`, { type: event.type, id: event.id });

    switch (event.type) {
      case 'payment.succeeded':
      case 'payment_intent.succeeded':
      case 'order.paid':
      case 'transfer.completed':
        await handlePaymentSuccess(gateway, event);
        break;

      case 'payment.failed':
      case 'payment_intent.payment_failed':
      case 'order.failed':
      case 'transfer.failed':
        await handlePaymentFailure(gateway, event);
        break;

      case 'payment.pending':
      case 'payment_intent.processing':
      case 'order.pending':
      case 'transfer.pending':
        await handlePaymentPending(gateway, event);
        break;

      case 'payout.completed':
      case 'transfer.completed':
        await handlePayoutSuccess(gateway, event);
        break;

      case 'payout.failed':
      case 'transfer.failed':
        await handlePayoutFailure(gateway, event);
        break;

      default:
        logger.info(`Unhandled ${gateway} webhook event type: ${event.type}`);
    }

  } catch (error) {
    logger.error(`Error processing ${gateway} webhook event:`, error);
    throw error;
  }
}

/**
 * Handle successful payment events
 */
async function handlePaymentSuccess(gateway: string, event: any) {
  const transactionId = event.transactionId || event.id;
  const gatewayTransactionId = event.gatewayTransactionId || event.paymentId || event.id;

  await prisma.unifiedPayment.updateMany({
    where: {
      OR: [
        { transactionId },
        { gatewayTransactionId }
      ]
    },
    data: {
      status: 'completed',
      updatedAt: new Date(),
      metadata: {
        ...event.metadata,
        webhookProcessedAt: new Date().toISOString(),
        webhookEventId: event.id
      }
    }
  });

  // Create purchase record if payment type
  if (event.metadata?.userId && event.metadata?.appId) {
    const existingPurchase = await prisma.purchase.findFirst({
      where: {
        userId: event.metadata.userId,
        appId: event.metadata.appId,
        stripePaymentIntentId: gatewayTransactionId
      }
    });

    if (!existingPurchase) {
      await prisma.purchase.create({
        data: {
          userId: event.metadata.userId,
          appId: event.metadata.appId,
          amount: event.amount || 0,
          currency: event.currency || 'USD',
          status: 'COMPLETED',
          purchaseDate: new Date(),
          ...(gateway === 'stripe' && { stripePaymentIntentId: gatewayTransactionId })
        }
      });
    }
  }

  logger.info(`Payment success processed for ${gateway} transaction: ${transactionId}`);
}

/**
 * Handle failed payment events
 */
async function handlePaymentFailure(gateway: string, event: any) {
  const transactionId = event.transactionId || event.id;
  const gatewayTransactionId = event.gatewayTransactionId || event.paymentId || event.id;

  await prisma.unifiedPayment.updateMany({
    where: {
      OR: [
        { transactionId },
        { gatewayTransactionId }
      ]
    },
    data: {
      status: 'failed',
      updatedAt: new Date(),
      metadata: {
        ...event.metadata,
        failureReason: event.failureReason || event.error?.message,
        webhookProcessedAt: new Date().toISOString(),
        webhookEventId: event.id
      }
    }
  });

  logger.warn(`Payment failure processed for ${gateway} transaction: ${transactionId}`);
}

/**
 * Handle pending payment events
 */
async function handlePaymentPending(gateway: string, event: any) {
  const transactionId = event.transactionId || event.id;
  const gatewayTransactionId = event.gatewayTransactionId || event.paymentId || event.id;

  await prisma.unifiedPayment.updateMany({
    where: {
      OR: [
        { transactionId },
        { gatewayTransactionId }
      ]
    },
    data: {
      status: 'pending',
      updatedAt: new Date(),
      metadata: {
        ...event.metadata,
        webhookProcessedAt: new Date().toISOString(),
        webhookEventId: event.id
      }
    }
  });

  logger.info(`Payment pending processed for ${gateway} transaction: ${transactionId}`);
}

/**
 * Handle successful payout events
 */
async function handlePayoutSuccess(gateway: string, event: any) {
  const transactionId = event.transactionId || event.id;
  const gatewayTransactionId = event.gatewayTransactionId || event.payoutId || event.id;

  await prisma.unifiedPayment.updateMany({
    where: {
      OR: [
        { transactionId },
        { gatewayTransactionId }
      ],
      paymentType: 'payout'
    },
    data: {
      status: 'completed',
      updatedAt: new Date(),
      metadata: {
        ...event.metadata,
        webhookProcessedAt: new Date().toISOString(),
        webhookEventId: event.id
      }
    }
  });

  logger.info(`Payout success processed for ${gateway} transaction: ${transactionId}`);
}

/**
 * Handle failed payout events
 */
async function handlePayoutFailure(gateway: string, event: any) {
  const transactionId = event.transactionId || event.id;
  const gatewayTransactionId = event.gatewayTransactionId || event.payoutId || event.id;

  await prisma.unifiedPayment.updateMany({
    where: {
      OR: [
        { transactionId },
        { gatewayTransactionId }
      ],
      paymentType: 'payout'
    },
    data: {
      status: 'failed',
      updatedAt: new Date(),
      metadata: {
        ...event.metadata,
        failureReason: event.failureReason || event.error?.message,
        webhookProcessedAt: new Date().toISOString(),
        webhookEventId: event.id
      }
    }
  });

  logger.warn(`Payout failure processed for ${gateway} transaction: ${transactionId}`);
}

export default router;