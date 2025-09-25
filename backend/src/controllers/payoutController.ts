import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { payoutService } from '../services/payoutService';
import { logger } from '../utils/logger';
import { createAppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Developer payout endpoints

export const getDeveloperEarnings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const developerId = req.user!.id;
    const { startDate, endDate } = req.query;

    const earnings = await payoutService.calculateDeveloperEarnings(
      developerId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: earnings,
    });
  } catch (error) {
    logger.error('Failed to get developer earnings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve earnings data',
    });
  }
};

export const requestPayout = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const developerId = req.user!.id;
    const { amount, currency, method, accountDetails } = req.body;

    const payoutId = await payoutService.requestPayout({
      developerId,
      amount,
      currency,
      method,
      accountDetails,
    });

    res.status(201).json({
      success: true,
      data: {
        payoutId,
        message: 'Payout request submitted successfully',
      },
    });
  } catch (error: any) {
    logger.error('Failed to request payout:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to request payout',
    });
  }
};

export const getDeveloperPayouts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const developerId = req.user!.id;
    const { status, page = 1, limit = 20 } = req.query;

    const payouts = await payoutService.getDeveloperPayouts(
      developerId,
      status as string,
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: payouts,
    });
  } catch (error) {
    logger.error('Failed to get developer payouts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payouts',
    });
  }
};

export const getPayoutStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { payoutId } = req.params;
    const developerId = req.user!.id;

    // Verify payout ownership
    const payout = await prisma.payout.findFirst({
      where: {
        id: payoutId,
        developerId,
      },
    });

    if (!payout) {
      return res.status(404).json({
        success: false,
        message: 'Payout not found',
      });
    }

    const status = await payoutService.getPayoutStatus(payoutId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error('Failed to get payout status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payout status',
    });
  }
};

export const updatePayoutAccountDetails = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const developerId = req.user!.id;
    const { method, accountDetails } = req.body;

    await payoutService.updatePayoutAccountDetails(developerId, method, accountDetails);

    res.json({
      success: true,
      message: 'Payout account details updated successfully',
    });
  } catch (error) {
    logger.error('Failed to update payout account details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update account details',
    });
  }
};

export const updateAutoPayoutSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const developerId = req.user!.id;
    const { enabled, threshold, interval } = req.body;

    await payoutService.updateAutoPayoutSettings(developerId, enabled, threshold, interval);

    res.json({
      success: true,
      message: 'Auto payout settings updated successfully',
    });
  } catch (error) {
    logger.error('Failed to update auto payout settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update auto payout settings',
    });
  }
};

export const getPayoutAccountDetails = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const developerId = req.user!.id;

    const developer = await prisma.developer.findUnique({
      where: { id: developerId },
      select: {
        payoutMethod: true,
        bankDetails: true,
      },
    });

    if (!developer) {
      return res.status(404).json({
        success: false,
        message: 'Developer not found',
      });
    }

    res.json({
      success: true,
      data: {
        method: developer.payoutMethod,
        accountDetails: developer.bankDetails,
      },
    });
  } catch (error) {
    logger.error('Failed to get payout account details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve account details',
    });
  }
};

export const getAutoPayoutSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Auto payout functionality is disabled until schema is updated with required fields
    logger.info('Auto payout settings requested but feature is disabled');
    
    res.json({
      success: true,
      data: {
        enabled: false,
        threshold: 50,
        interval: 7,
        message: 'Auto payout feature is currently disabled',
      },
    });
  } catch (error) {
    logger.error('Failed to get auto payout settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve auto payout settings',
    });
  }
};

// Admin payout endpoints

export const getPayoutAnalytics = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const analytics = await payoutService.getPayoutAnalytics(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error('Failed to get payout analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payout analytics',
    });
  }
};

export const getAllPayouts = async (req: Request, res: Response) => {
  try {
    const {
      status,
      method,
      developerId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'requestedAt',
      sortOrder = 'desc',
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: any = {};

    if (status) where.status = status;
    if (method) where.method = method;
    if (developerId) where.developerId = developerId;
    if (startDate || endDate) {
      where.requestedAt = {};
      if (startDate) where.requestedAt.gte = new Date(startDate as string);
      if (endDate) where.requestedAt.lte = new Date(endDate as string);
    }

    const [payouts, total] = await Promise.all([
      prisma.payout.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          developer: {
            select: {
              id: true,
              companyName: true,
              email: true,
            },
          },
        },
      }),
      prisma.payout.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        payouts,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error) {
    logger.error('Failed to get all payouts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payouts',
    });
  }
};

export const getPayoutDetails = async (req: Request, res: Response) => {
  try {
    const { payoutId } = req.params;

    const payout = await prisma.payout.findUnique({
      where: { id: payoutId },
      include: {
        developer: {
          select: {
            id: true,
            companyName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    if (!payout) {
      return res.status(404).json({
        success: false,
        message: 'Payout not found',
      });
    }

    res.json({
      success: true,
      data: payout,
    });
  } catch (error) {
    logger.error('Failed to get payout details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payout details',
    });
  }
};

export const approvePayout = async (req: Request, res: Response) => {
  try {
    const { payoutId } = req.params;
    const { notes } = req.body;

    const payout = await prisma.payout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      return res.status(404).json({
        success: false,
        message: 'Payout not found',
      });
    }

    if (payout.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Payout is not in pending status',
      });
    }

    // Update payout status and process
    await prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: 'PROCESSING',
      },
    });

    // Process the payout
    const result = await payoutService.requestPayout({
      developerId: payout.developerId,
      amount: payout.amount,
      currency: payout.currency,
      method: payout.method as any,
      accountDetails: payout.bankDetails,
    });

    res.json({
      success: true,
      message: 'Payout approved and processing',
      data: { payoutId: result },
    });
    return;
  } catch (error) {
    logger.error('Failed to approve payout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve payout',
    });
  }
};

export const rejectPayout = async (req: Request, res: Response) => {
  try {
    const { payoutId } = req.params;
    const { reason, notes } = req.body;

    const payout = await prisma.payout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      return res.status(404).json({
        success: false,
        message: 'Payout not found',
      });
    }

    if (payout.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Payout is not in pending status',
      });
    }

    await prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: 'FAILED',
        failureReason: reason,
      },
    });

    res.json({
      success: true,
      message: 'Payout rejected successfully',
    });
  } catch (error) {
    logger.error('Failed to reject payout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject payout',
    });
  }
};

export const bulkProcessPayouts = async (req: Request, res: Response) => {
  try {
    const { payoutIds, action, reason, notes } = req.body;

    const results = [];

    for (const payoutId of payoutIds) {
      try {
        if (action === 'approve') {
          await approvePayout({ ...req, params: { payoutId } } as any, res);
        } else if (action === 'reject') {
          await rejectPayout({ ...req, params: { payoutId }, body: { reason, notes } } as any, res);
        }
        results.push({ payoutId, success: true });
      } catch (error: any) {
        results.push({ payoutId, success: false, error: error.message });
      }
    }

    res.json({
      success: true,
      message: 'Bulk processing completed',
      data: results,
    });
    return;
  } catch (error) {
    logger.error('Failed to bulk process payouts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk process payouts',
    });
  }
};

export const createManualPayout = async (req: Request, res: Response) => {
  try {
    const { developerId, amount, currency, method, reason, notes } = req.body;

    // Verify developer exists
    const developer = await prisma.developer.findUnique({
      where: { id: developerId },
    });

    if (!developer) {
      return res.status(404).json({
        success: false,
        message: 'Developer not found',
      });
    }

    // Create manual payout record
    const payout = await prisma.payout.create({
      data: {
        developerId,
        amount,
        currency,
        method,
        bankDetails: JSON.stringify({}),
        status: 'PENDING',
        period: new Date().toISOString().slice(0, 7), // YYYY-MM format
        transactionIds: '',
        netAmount: amount,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Manual payout created successfully',
      data: payout,
    });
  } catch (error) {
    logger.error('Failed to create manual payout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create manual payout',
    });
  }
};

export const getPendingApprovals = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [payouts, total] = await Promise.all([
      prisma.payout.findMany({
        where: { status: 'PENDING' },
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'asc' },
        include: {
          developer: {
            select: {
              id: true,
              companyName: true,
              email: true,
            },
          },
        },
      }),
      prisma.payout.count({ where: { status: 'PENDING' } }),
    ]);

    res.json({
      success: true,
      data: {
        payouts,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error) {
    logger.error('Failed to get pending approvals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pending approvals',
    });
  }
};

export const getFailedPayouts = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [payouts, total] = await Promise.all([
      prisma.payout.findMany({
        where: { status: 'FAILED' },
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: {
          developer: {
            select: {
              id: true,
              companyName: true,
              email: true,
            },
          },
        },
      }),
      prisma.payout.count({ where: { status: 'FAILED' } }),
    ]);

    res.json({
      success: true,
      data: {
        payouts,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error) {
    logger.error('Failed to get failed payouts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve failed payouts',
    });
  }
};

export const retryFailedPayouts = async (req: Request, res: Response) => {
  try {
    const { payoutIds } = req.body;

    const results = [];

    for (const payoutId of payoutIds) {
      try {
        const payout = await prisma.payout.findUnique({
          where: { id: payoutId },
        });

        if (!payout || payout.status !== 'FAILED') {
          results.push({ payoutId, success: false, error: 'Payout not found or not failed' });
          continue;
        }

        // Reset payout status and retry
        await prisma.payout.update({
          where: { id: payoutId },
          data: {
            status: 'PENDING',
            failureReason: null,
          },
        });

        results.push({ payoutId, success: true });
      } catch (error) {
        results.push({ payoutId, success: false, error: error.message });
      }
    }

    res.json({
      success: true,
      message: 'Retry processing completed',
      data: results,
    });
  } catch (error) {
    logger.error('Failed to retry failed payouts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retry failed payouts',
    });
  }
};

export const getDeveloperEarningsAdmin = async (req: Request, res: Response) => {
  try {
    const { developerId } = req.params;
    const { startDate, endDate } = req.query;

    const earnings = await payoutService.calculateDeveloperEarnings(
      developerId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: earnings,
    });
  } catch (error) {
    logger.error('Failed to get developer earnings (admin):', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve developer earnings',
    });
  }
};

export const getDeveloperPayoutsAdmin = async (req: Request, res: Response) => {
  try {
    const { developerId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    const payouts = await payoutService.getDeveloperPayouts(
      developerId,
      status as string,
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: payouts,
    });
  } catch (error) {
    logger.error('Failed to get developer payouts (admin):', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve developer payouts',
    });
  }
};

export const updateDeveloperAutoPayoutSettings = async (req: Request, res: Response) => {
  try {
    const { developerId } = req.params;
    const { enabled, threshold, interval } = req.body;

    await payoutService.updateAutoPayoutSettings(developerId, enabled, threshold, interval);

    res.json({
      success: true,
      message: 'Developer auto payout settings updated successfully',
    });
  } catch (error) {
    logger.error('Failed to update developer auto payout settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update auto payout settings',
    });
  }
};

export const getRevenueSummary = async (req: Request, res: Response) => {
  try {
    const { timeframe = '30d' } = req.query;

    const endDate = new Date();
    const startDate = new Date();

    switch (timeframe) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    const [totalRevenue, totalPayouts, pendingPayouts, platformRevenue] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),
      prisma.payout.aggregate({
        where: {
          status: 'COMPLETED',
          processedAt: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),
      prisma.payout.aggregate({
        where: {
          status: { in: ['PENDING', 'PROCESSING'] },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { platformFee: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalRevenue: totalRevenue._sum.amount || 0,
        totalPayouts: totalPayouts._sum?.amount || 0,
        pendingPayouts: pendingPayouts._sum.amount || 0,
        platformRevenue: platformRevenue._sum.platformFee || 0,
        timeframe,
      },
    });
  } catch (error) {
    logger.error('Failed to get revenue summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve revenue summary',
    });
  }
};

export const getTopEarners = async (req: Request, res: Response) => {
  try {
    const { timeframe = '30d', limit = 10 } = req.query;

    const endDate = new Date();
    const startDate = new Date();

    switch (timeframe) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    const topEarners = await prisma.transaction.groupBy({
      by: ['appId'],
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startDate, lte: endDate },
        appId: { not: null },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: parseInt(limit as string),
    });

    // Get app and developer details
    const enrichedEarners = await Promise.all(
      topEarners.map(async (earner) => {
        const app = earner.appId ? await prisma.app.findUnique({
          where: { id: earner.appId },
          include: {
            developer: {
              select: {
                id: true,
                companyName: true,
                email: true,
              },
            },
          },
        }) : null;

        return {
          app: app,
          earnings: earner._sum?.amount || 0,
          developerEarnings: (earner._sum?.amount || 0) * 0.8, // After 20% platform fee
        };
      })
    );

    res.json({
      success: true,
      data: enrichedEarners,
    });
  } catch (error) {
    logger.error('Failed to get top earners:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve top earners',
    });
  }
};

export const getPayoutTrends = async (req: Request, res: Response) => {
  try {
    const { timeframe = '30d', breakdown = 'daily' } = req.query;

    const analytics = await payoutService.getPayoutAnalytics();

    res.json({
      success: true,
      data: {
        trends: analytics.monthlyPayouts,
        summary: analytics.summary,
      },
    });
  } catch (error) {
    logger.error('Failed to get payout trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payout trends',
    });
  }
};

export const exportPayoutData = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, format = 'csv', filters } = req.body;

    // Build query based on filters
    const where: any = {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    if (filters) {
      if (filters.status) where.status = filters.status;
      if (filters.method) where.method = filters.method;
      if (filters.developerId) where.developerId = filters.developerId;
    }

    const payouts = await prisma.payout.findMany({
      where,
      include: {
        developer: {
          select: {
            companyName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let exportData: string;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'csv':
        exportData = generateCSV(payouts);
        contentType = 'text/csv';
        filename = `payouts_${startDate}_${endDate}.csv`;
        break;
      case 'json':
        exportData = JSON.stringify(payouts, null, 2);
        contentType = 'application/json';
        filename = `payouts_${startDate}_${endDate}.json`;
        break;
      default:
        throw new Error('Unsupported export format');
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', contentType);
    res.send(exportData);
    return;
  } catch (error) {
    logger.error('Failed to export payout data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export payout data',
    });
  }
};

// Webhook handlers

export const handleRazorpayWebhook = async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const body = JSON.stringify(req.body);

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const { event, payload } = req.body;

    if (event === 'payout.processed' || event === 'payout.failed') {
      const payoutId = payload.payout.entity.reference_id;
      const status = event === 'payout.processed' ? 'COMPLETED' : 'FAILED';

      await prisma.payout.update({
        where: { id: payoutId },
        data: {
          status,
          processedAt: status === 'COMPLETED' ? new Date() : null,
          gatewayResponse: status === 'FAILED' ? payload.payout.entity.failure_reason : null,
        },
      });

      logger.info(`Razorpay payout ${payoutId} status updated to ${status}`);
    }

    res.json({ success: true });
    return;
  } catch (error) {
    logger.error('Failed to handle Razorpay webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

export const handlePayoneerWebhook = async (req: Request, res: Response) => {
  try {
    const { payment_id, status } = req.body;

    const payoutStatus = status === 'completed' ? 'COMPLETED' : 
                        status === 'failed' ? 'FAILED' : 'PROCESSING';

    await prisma.payout.update({
      where: { id: payment_id },
      data: {
        status: payoutStatus,
        processedAt: payoutStatus === 'COMPLETED' ? new Date() : null,
      },
    });

    logger.info(`Payoneer payout ${payment_id} status updated to ${payoutStatus}`);
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to handle Payoneer webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// System endpoints

export const processAutomaticPayouts = async (req: Request, res: Response) => {
  try {
    await payoutService.processAutomaticPayouts();

    res.json({
      success: true,
      message: 'Automatic payouts processed successfully',
    });
  } catch (error) {
    logger.error('Failed to process automatic payouts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process automatic payouts',
    });
  }
};

export const syncPayoutStatuses = async (req: Request, res: Response) => {
  try {
    const processingPayouts = await prisma.payout.findMany({
      where: {
        status: 'PROCESSING',
        transactionIds: { not: '' },
      },
    });

    const results = [];

    for (const payout of processingPayouts) {
      try {
        const updatedStatus = await payoutService.getPayoutStatus(payout.id);
        results.push({ payoutId: payout.id, status: updatedStatus.status });
      } catch (error) {
        results.push({ payoutId: payout.id, error: (error as Error).message });
      }
    }

    res.json({
      success: true,
      message: 'Payout statuses synced successfully',
      data: results,
    });
    return;
  } catch (error) {
    logger.error('Failed to sync payout statuses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync payout statuses',
    });
  }
};

// Helper functions

function generateCSV(payouts: any[]): string {
  const headers = [
    'ID',
    'Developer',
    'Amount',
    'Currency',
    'Method',
    'Status',
    'Created At',
    'Processed At',
    'Transaction IDs',
  ];

  const rows = payouts.map(payout => [
    payout.id,
    payout.developer.companyName,
    payout.amount,
    payout.currency,
    payout.method,
    payout.status,
    payout.createdAt.toISOString(),
    payout.processedAt?.toISOString() || '',
    payout.transactionIds || '',
  ]);

  return [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
}