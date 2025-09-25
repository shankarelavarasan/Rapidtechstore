import { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { PaymentOrchestrator } from '../services/paymentOrchestrator';
import { createCurrencyService } from '../services/currencyService';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();
const currencyService = createCurrencyService();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
  developer?: {
    id: string;
    email: string;
  };
}

export class PaymentOrchestratorController {
  /**
   * Create a payment using the orchestrator
   */
  static async createPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { amount, currency, region, appId, description, metadata } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Verify the app exists
      const app = await prisma.app.findFirst({
        where: {
          id: appId,
          status: 'PUBLISHED',
        },
        include: {
          developer: true,
        }
      });

      if (!app) {
        return res.status(404).json({
          success: false,
          message: 'App not found or not published'
        });
      }

      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Create payment request
      const paymentRequest = {
        userId,
        amount,
        currency,
        region: region || 'DEFAULT',
        description,
        metadata: {
          appId,
          userId,
          developerId: app.developerId,
          userEmail: user.email,
          userName: user.name || user.email,
          ...metadata
        }
      };

      // Process payment through orchestrator
      const response = await PaymentOrchestrator.processPayment(paymentRequest);

      if (!response.success) {
        return res.status(400).json({
          success: false,
          message: 'Payment processing failed',
          error: response.error
        });
      }

      // Save to database
      const unifiedPayment = await prisma.unifiedPayment.create({
        data: {
          transactionId: response.transactionId,
          gatewayTransactionId: response.gatewayTransactionId || response.transactionId,
          gateway: response.gateway,
          paymentType: 'payment',
          status: response.status,
          amount: response.amount,
          currency: response.currency,
          region: response.region,
          userId,
          appId,
          developerId: app.developerId,
          metadata: JSON.stringify(response.metadata || {}),
          clientSecret: response.clientSecret,
          grossAmount: response.amount,
        }
      });

      res.status(201).json({
        success: true,
        data: {
          paymentId: unifiedPayment.id,
          transactionId: response.transactionId,
          clientSecret: response.clientSecret,
          status: response.status,
          gateway: response.gateway,
          amount: response.amount,
          currency: response.currency,
          metadata: response.metadata
        }
      });

    } catch (error) {
      logger.error('Payment creation failed:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Create a payout using the orchestrator
   */
  static async createPayout(req: AuthenticatedRequest, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { amount, currency, region, recipient, description, metadata } = req.body;
      const developerId = req.developer?.id;

      if (!developerId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Verify developer exists and is active
      const developer = await prisma.developer.findUnique({
        where: { id: developerId }
      });

      if (!developer) {
        return res.status(403).json({
          success: false,
          message: 'Only developers can create payouts'
        });
      }

      // Create payout request
      const payoutRequest = {
        developerId: developer.id,
        amount,
        currency,
        region: region || 'DEFAULT',
        description,
        bankAccount: recipient?.bankAccount,
        paypalEmail: recipient?.paypalEmail,
        metadata: {
          developerId: developer.id,
          ...metadata
        }
      };

      // Process payout through orchestrator
      const response = await PaymentOrchestrator.processPayout(payoutRequest);

      if (!response.success) {
        return res.status(400).json({
          success: false,
          message: 'Payout processing failed',
          error: response.error
        });
      }

      // Save to database
      const unifiedPayment = await prisma.unifiedPayment.create({
        data: {
          transactionId: response.payoutId,
          gatewayTransactionId: response.gatewayPayoutId || response.payoutId,
          gateway: response.gateway,
          paymentType: 'payout',
          status: response.status,
          amount: response.amount,
          currency: response.currency,
          region: response.region,
          userId: developerId,
          developerId: developer.id,
          metadata: JSON.stringify(response.metadata || {}),
          grossAmount: response.amount,
        }
      });

      res.status(201).json({
        success: true,
        data: {
          payoutId: response.payoutId,
          status: response.status,
          gateway: response.gateway,
          amount: response.amount,
          currency: response.currency,
          estimatedArrival: response.estimatedArrival,
          metadata: response.metadata
        }
      });

    } catch (error) {
      logger.error('Payout creation failed:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get payment status
   */
  static async getPaymentStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { transactionId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const payment = await prisma.unifiedPayment.findFirst({
        where: {
          transactionId,
          userId
        },
        include: {
          app: {
            select: {
              name: true,
              id: true
            }
          }
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
          status: payment.status,
          gateway: payment.gateway,
          amount: payment.amount,
          currency: payment.currency,
          region: payment.region,
          type: payment.paymentType,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
          app: payment.app,
          metadata: payment.metadata
        }
      });

    } catch (error) {
      logger.error('Get payment status failed:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get supported payment methods for a region
   */
  static async getSupportedMethods(req: Request, res: Response) {
    try {
      const { region } = req.params;
      
      const methods = PaymentOrchestrator.getSupportedPaymentMethods(region);
      const gateways = PaymentOrchestrator.getSupportedGateways(region);

      res.json({
        success: true,
        data: {
          region,
          paymentMethods: methods,
          gateways,
          currencies: currencyService.getSupportedCurrencies(region)
        }
      });

    } catch (error) {
      logger.error('Get supported methods failed:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Convert currency
   */
  static async convertCurrency(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { amount, fromCurrency, toCurrency, preferredProvider } = req.body;

      const conversion = await currencyService.convertCurrency({
        amount,
        fromCurrency,
        toCurrency,
        preferredProvider
      });

      res.json({
        success: conversion.success,
        data: conversion.success ? {
          originalAmount: conversion.originalAmount,
          convertedAmount: conversion.convertedAmount,
          fromCurrency: conversion.fromCurrency,
          toCurrency: conversion.toCurrency,
          exchangeRate: conversion.exchangeRate,
          provider: conversion.provider,
          timestamp: conversion.timestamp
        } : null,
        error: conversion.error
      });

    } catch (error) {
      logger.error('Currency conversion failed:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get payment analytics
   */
  static async getPaymentAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { startDate, endDate, region, gateway } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const whereClause: any = {
        userId,
        createdAt: {}
      };

      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate as string);
      }

      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate as string);
      }

      if (region) {
        whereClause.region = region;
      }

      if (gateway) {
        whereClause.gateway = gateway;
      }

      const [totalPayments, totalAmount, paymentsByGateway, paymentsByRegion] = await Promise.all([
        prisma.unifiedPayment.count({ where: whereClause }),
        prisma.unifiedPayment.aggregate({
          where: whereClause,
          _sum: { amount: true }
        }),
        prisma.unifiedPayment.groupBy({
          by: ['gateway'],
          where: whereClause,
          _count: { _all: true },
          _sum: { amount: true }
        }),
        prisma.unifiedPayment.groupBy({
          by: ['region'],
          where: whereClause,
          _count: { _all: true },
          _sum: { amount: true }
        })
      ]);

      res.json({
        success: true,
        data: {
          totalPayments,
          totalAmount: totalAmount._sum.amount || 0,
          paymentsByGateway,
          paymentsByRegion,
          period: {
            startDate,
            endDate
          }
        }
      });

    } catch (error) {
      logger.error('Get payment analytics failed:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

// Validation middleware
export const validatePaymentCreation = [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('currency').isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  body('appId').exists().withMessage('App ID is required'),
  body('region').optional().isString(),
  body('description').optional().isString(),
  body('metadata').optional().isObject()
];

export const validatePayoutCreation = [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('currency').isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  body('recipient').isObject().withMessage('Recipient details are required'),
  body('region').optional().isString(),
  body('description').optional().isString(),
  body('metadata').optional().isObject()
];

export const validateCurrencyConversion = [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('fromCurrency').isLength({ min: 3, max: 3 }).withMessage('From currency must be 3 characters'),
  body('toCurrency').isLength({ min: 3, max: 3 }).withMessage('To currency must be 3 characters'),
  body('preferredProvider').optional().isIn(['fixer', 'exchangerate', 'openexchange'])
];