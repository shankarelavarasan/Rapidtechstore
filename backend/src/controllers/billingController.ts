import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { billingService } from '../services/billingService';
import { createAppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import crypto from 'crypto';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
}

/**
 * Verify and process a purchase from Google Play
 */
export const verifyPurchase = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { purchaseToken, productId, appId, orderId, type } = req.body;
    const userId = req.user!.id;

    // Validate app exists and is published
    const app = await prisma.app.findFirst({
      where: {
        id: appId,
        status: 'PUBLISHED',
      },
    });

    if (!app) {
      throw createAppError('App not found or not available', 404);
    }

    let result;

    if (type === 'subscription') {
      result = await billingService.processSubscriptionPurchase(
        userId,
        appId,
        purchaseToken,
        productId,
        orderId
      );
    } else {
      result = await billingService.processOneTimePurchase(
        userId,
        appId,
        purchaseToken,
        productId,
        orderId
      );
    }

    res.status(201).json({
      success: true,
      message: 'Purchase verified and processed successfully',
      data: {
        id: result,
        type,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle Google Play webhook notifications
 */
export const handleWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Verify webhook signature (if configured)
    const signature = req.headers['x-goog-message-signature'] as string;
    if (process.env.GOOGLE_PLAY_WEBHOOK_SECRET && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.GOOGLE_PLAY_WEBHOOK_SECRET)
        .update(JSON.stringify(req.body))
        .digest('base64');

      if (signature !== expectedSignature) {
        throw createAppError('Invalid webhook signature', 401);
      }
    }

    // Decode the notification data
    const notificationData = req.body;
    
    if (notificationData.message && notificationData.message.data) {
      const decodedData = JSON.parse(
        Buffer.from(notificationData.message.data, 'base64').toString()
      );

      await billingService.handleWebhookNotification(decodedData);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Webhook processing failed:', error);
    next(error);
  }
};

/**
 * Get user's subscriptions
 */
export const getUserSubscriptions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { status, page = 1, limit = 20 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: {
          app: {
            select: {
              id: true,
              name: true,
              icon: true,
              developer: {
                select: {
                  companyName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.subscription.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        subscriptions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get subscription details
 */
export const getSubscriptionDetails = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { subscriptionId } = req.params;
    const userId = req.user!.id;

    const subscription = await billingService.getSubscriptionStatus(subscriptionId);

    if (subscription.userId !== userId) {
      throw createAppError('Subscription not found', 404);
    }

    res.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel a subscription
 */
export const cancelSubscription = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { subscriptionId } = req.params;
    const { reason } = req.body;
    const userId = req.user!.id;

    await billingService.cancelSubscription(subscriptionId, userId);

    // Log cancellation reason if provided
    if (reason) {
      await prisma.subscriptionCancellation.create({
        data: {
          subscriptionId,
          reason,
          cancelledBy: userId,
        },
      });
    }

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's transaction history
 */
export const getUserTransactions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const {
      type,
      status,
      appId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { userId };

    if (type) where.type = type;
    if (status) where.status = status;
    if (appId) where.appId = appId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          app: {
            select: {
              id: true,
              name: true,
              icon: true,
              developer: {
                select: {
                  companyName: true,
                },
              },
            },
          },
          subscription: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get transaction details
 */
export const getTransactionDetails = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { transactionId } = req.params;
    const userId = req.user!.id;

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
      include: {
        app: {
          select: {
            id: true,
            name: true,
            icon: true,
            developer: {
              select: {
                companyName: true,
              },
            },
          },
        },
        subscription: {
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    if (!transaction) {
      throw createAppError('Transaction not found', 404);
    }

    res.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request a refund
 */
export const requestRefund = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { transactionId, reason, type, amount } = req.body;
    const userId = req.user!.id;

    // Verify transaction belongs to user
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
        status: 'COMPLETED',
      },
    });

    if (!transaction) {
      throw createAppError('Transaction not found or not eligible for refund', 404);
    }

    // Check if refund already exists
    const existingRefund = await prisma.refund.findFirst({
      where: { transactionId },
    });

    if (existingRefund) {
      throw createAppError('Refund request already exists for this transaction', 400);
    }

    // Create refund request
    const refund = await prisma.refund.create({
      data: {
        transactionId,
        userId,
        reason,
        type,
        requestedAmount: type === 'partial' ? amount : transaction.amount,
        status: 'PENDING',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Refund request submitted successfully',
      data: refund,
    });
  } catch (error) {
    next(error);
  }
};

// Admin Controllers

/**
 * Get all transactions (Admin)
 */
export const getAllTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      userId,
      appId,
      developerId,
      type,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (userId) where.userId = userId;
    if (appId) where.appId = appId;
    if (type) where.type = type;
    if (status) where.status = status;

    if (developerId) {
      where.app = {
        developerId,
      };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          app: {
            select: {
              id: true,
              name: true,
              icon: true,
              developer: {
                select: {
                  id: true,
                  companyName: true,
                  email: true,
                },
              },
            },
          },
          subscription: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all subscriptions (Admin)
 */
export const getAllSubscriptions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      userId,
      appId,
      developerId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (userId) where.userId = userId;
    if (appId) where.appId = appId;
    if (status) where.status = status;

    if (developerId) {
      where.app = {
        developerId,
      };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          app: {
            select: {
              id: true,
              name: true,
              icon: true,
              developer: {
                select: {
                  id: true,
                  companyName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.subscription.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        subscriptions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get revenue analytics (Admin)
 */
export const getRevenueAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      period = 'month',
      startDate,
      endDate,
      appId,
      developerId,
    } = req.query;

    const where: any = {
      status: 'COMPLETED',
    };

    if (appId) where.appId = appId;

    if (developerId) {
      where.app = {
        developerId,
      };
    }

    // Set date range based on period
    const now = new Date();
    let dateRange: { gte?: Date; lte?: Date } = {};

    if (startDate && endDate) {
      dateRange = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    } else {
      switch (period) {
        case 'day':
          dateRange.gte = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          dateRange.gte = weekStart;
          break;
        case 'month':
          dateRange.gte = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          dateRange.gte = new Date(now.getFullYear(), 0, 1);
          break;
      }
    }

    where.createdAt = dateRange;

    // Get revenue data
    const [
      totalRevenue,
      subscriptionRevenue,
      oneTimeRevenue,
      transactionCount,
      topApps,
      revenueByDate,
    ] = await Promise.all([
      // Total revenue
      prisma.transaction.aggregate({
        where,
        _sum: { amount: true },
      }),

      // Subscription revenue
      prisma.transaction.aggregate({
        where: { ...where, type: 'SUBSCRIPTION' },
        _sum: { amount: true },
      }),

      // One-time purchase revenue
      prisma.transaction.aggregate({
        where: { ...where, type: 'ONE_TIME' },
        _sum: { amount: true },
      }),

      // Transaction count
      prisma.transaction.count({ where }),

      // Top revenue generating apps
      prisma.transaction.groupBy({
        by: ['appId'],
        where,
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
        take: 10,
      }),

      // Revenue by date (for charts)
      prisma.$queryRaw`
        SELECT 
          DATE(createdAt) as date,
          SUM(amount) as revenue,
          COUNT(*) as transactions
        FROM Transaction 
        WHERE status = 'COMPLETED'
          AND createdAt >= ${dateRange.gte}
          ${dateRange.lte ? `AND createdAt <= ${dateRange.lte}` : ''}
          ${appId ? `AND appId = ${appId}` : ''}
        GROUP BY DATE(createdAt)
        ORDER BY date DESC
        LIMIT 30
      `,
    ]);

    // Get app details for top apps
    const topAppIds = topApps.map((app: any) => app.appId);
    const appDetails = await prisma.app.findMany({
      where: { id: { in: topAppIds } },
      select: {
        id: true,
        name: true,
        icon: true,
        developer: {
          select: {
            companyName: true,
          },
        },
      },
    });

    const topAppsWithDetails = topApps.map((app: any) => {
      const details = appDetails.find((detail) => detail.id === app.appId);
      return {
        ...app,
        app: details,
      };
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue: totalRevenue._sum.amount || 0,
          subscriptionRevenue: subscriptionRevenue._sum.amount || 0,
          oneTimeRevenue: oneTimeRevenue._sum.amount || 0,
          transactionCount,
        },
        topApps: topAppsWithDetails,
        revenueByDate,
        period,
        dateRange,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Process a refund request (Admin)
 */
export const processRefund = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refundId } = req.params;
    const { action, adminNotes } = req.body;

    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        transaction: true,
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!refund) {
      throw createAppError('Refund request not found', 404);
    }

    if (refund.status !== 'PENDING') {
      throw createAppError('Refund request has already been processed', 400);
    }

    const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

    await prisma.refund.update({
      where: { id: refundId },
      data: {
        status: newStatus,
        adminNotes,
        processedAt: new Date(),
      },
    });

    // TODO: If approved, integrate with actual refund processing
    // This would involve calling Google Play's refund API

    res.json({
      success: true,
      message: `Refund request ${action}d successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all refund requests (Admin)
 */
export const getAllRefunds = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      status,
      userId,
      appId,
      page = 1,
      limit = 20,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (appId) {
      where.transaction = {
        appId,
      };
    }

    const [refunds, total] = await Promise.all([
      prisma.refund.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          transaction: {
            include: {
              app: {
                select: {
                  id: true,
                  name: true,
                  icon: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.refund.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        refunds,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Sync all subscriptions with Google Play (Admin)
 */
export const syncSubscriptions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await billingService.syncSubscriptions();

    res.json({
      success: true,
      message: 'Subscription sync initiated successfully',
    });
  } catch (error) {
    next(error);
  }
};