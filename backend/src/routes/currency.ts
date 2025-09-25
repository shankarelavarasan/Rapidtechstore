import express, { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { createCurrencyService } from '../services/currencyService';
import { logger } from '../utils/logger';

const router = express.Router();
const currencyService = createCurrencyService();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
}

// POST /api/currency/convert
router.post('/convert', [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('fromCurrency').isLength({ min: 3, max: 3 }).withMessage('From currency must be 3 characters'),
  body('toCurrency').isLength({ min: 3, max: 3 }).withMessage('To currency must be 3 characters'),
  body('preferredProvider').optional().isIn(['fixer', 'exchangerate', 'openexchange']).withMessage('Invalid provider')
], async (req: Request, res: Response) => {
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
      amount: parseFloat(amount),
      fromCurrency: fromCurrency.toUpperCase(),
      toCurrency: toCurrency.toUpperCase(),
      preferredProvider
    });

    if (!conversion.success) {
      return res.status(400).json({
        success: false,
        message: 'Currency conversion failed',
        error: conversion.error
      });
    }

    res.json({
      success: true,
      data: {
        originalAmount: conversion.originalAmount,
        convertedAmount: conversion.convertedAmount,
        fromCurrency: conversion.fromCurrency,
        toCurrency: conversion.toCurrency,
        exchangeRate: conversion.exchangeRate,
        provider: conversion.provider,
        timestamp: conversion.timestamp,
        cached: conversion.cached || false
      }
    });

  } catch (error) {
    logger.error('Currency conversion error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/currency/rates
router.get('/rates', [
  query('baseCurrency').optional().isLength({ min: 3, max: 3 }).withMessage('Base currency must be 3 characters'),
  query('targetCurrencies').optional().isString().withMessage('Target currencies must be a string'),
  query('provider').optional().isIn(['fixer', 'exchangerate', 'openexchange']).withMessage('Invalid provider')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { baseCurrency = 'USD', targetCurrencies, provider } = req.query;
    
    let currencies: string[] = [];
    if (targetCurrencies) {
      currencies = (targetCurrencies as string).split(',').map(c => c.trim().toUpperCase());
    } else {
      // Default to major currencies
      currencies = ['EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR'];
    }

    const rates = await currencyService.getExchangeRates(
      baseCurrency as string,
      currencies,
      provider as string
    );

    if (!rates.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to fetch exchange rates',
        error: rates.error
      });
    }

    res.json({
      success: true,
      data: {
        baseCurrency: rates.baseCurrency,
        rates: rates.rates,
        provider: rates.provider,
        timestamp: rates.timestamp,
        cached: rates.cached || false
      }
    });

  } catch (error) {
    logger.error('Exchange rates fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/currency/supported
router.get('/supported', async (req: Request, res: Response) => {
  try {
    const { region } = req.query;

    const supportedCurrencies = currencyService.getSupportedCurrencies(region as string);

    res.json({
      success: true,
      data: {
        region: region || 'global',
        currencies: supportedCurrencies,
        total: supportedCurrencies.length
      }
    });

  } catch (error) {
    logger.error('Get supported currencies error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/currency/providers
router.get('/providers', async (req: Request, res: Response) => {
  try {
    const providers = [
      {
        name: 'fixer',
        displayName: 'Fixer.io',
        description: 'Real-time foreign exchange rates API',
        features: ['Real-time rates', 'Historical data', '170+ currencies'],
        status: 'active'
      },
      {
        name: 'exchangerate',
        displayName: 'ExchangeRate-API',
        description: 'Free currency exchange rate API',
        features: ['Free tier available', 'Simple API', '160+ currencies'],
        status: 'active'
      },
      {
        name: 'openexchange',
        displayName: 'Open Exchange Rates',
        description: 'Reliable exchange rates and currency conversion',
        features: ['High accuracy', 'Historical data', '200+ currencies'],
        status: 'active'
      }
    ];

    res.json({
      success: true,
      data: {
        providers,
        defaultProvider: 'fixer',
        fallbackOrder: ['fixer', 'exchangerate', 'openexchange']
      }
    });

  } catch (error) {
    logger.error('Get currency providers error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/currency/batch-convert
router.post('/batch-convert', [
  body('conversions').isArray().withMessage('Conversions must be an array'),
  body('conversions.*.amount').isNumeric().withMessage('Amount must be a number'),
  body('conversions.*.fromCurrency').isLength({ min: 3, max: 3 }).withMessage('From currency must be 3 characters'),
  body('conversions.*.toCurrency').isLength({ min: 3, max: 3 }).withMessage('To currency must be 3 characters'),
  body('preferredProvider').optional().isIn(['fixer', 'exchangerate', 'openexchange']).withMessage('Invalid provider')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { conversions, preferredProvider } = req.body;

    if (conversions.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 50 conversions allowed per batch'
      });
    }

    const results = await Promise.allSettled(
      conversions.map(async (conversion: any) => {
        return await currencyService.convertCurrency({
          amount: parseFloat(conversion.amount),
          fromCurrency: conversion.fromCurrency.toUpperCase(),
          toCurrency: conversion.toCurrency.toUpperCase(),
          preferredProvider
        });
      })
    );

    const successfulConversions = [];
    const failedConversions = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        successfulConversions.push({
          index,
          ...result.value
        });
      } else {
        failedConversions.push({
          index,
          error: result.status === 'fulfilled' ? result.value.error : 'Conversion failed',
          originalRequest: conversions[index]
        });
      }
    });

    res.json({
      success: true,
      data: {
        successful: successfulConversions,
        failed: failedConversions,
        summary: {
          total: conversions.length,
          successful: successfulConversions.length,
          failed: failedConversions.length
        }
      }
    });

  } catch (error) {
    logger.error('Batch currency conversion error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/currency/cache/stats
router.get('/cache/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only allow authenticated users to view cache stats
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const cacheStats = currencyService.getCacheStats();

    res.json({
      success: true,
      data: cacheStats
    });

  } catch (error) {
    logger.error('Get cache stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/currency/cache/clear
router.delete('/cache/clear', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only allow authenticated users to clear cache
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Optional: Add role-based access control
    if (req.user.role !== 'admin' && req.user.role !== 'developer') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    currencyService.clearCache();

    logger.info(`Currency cache cleared by user: ${req.user.id}`);

    res.json({
      success: true,
      message: 'Currency cache cleared successfully'
    });

  } catch (error) {
    logger.error('Clear cache error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;