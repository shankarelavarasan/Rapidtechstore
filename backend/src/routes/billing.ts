import express from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest';
import { authenticateUser, authenticateAdmin } from '../middleware/auth';
import * as billingController from '../controllers/billingController';

const router = express.Router();

/**
 * @route POST /api/billing/verify-purchase
 * @desc Verify and process a purchase from Google Play
 * @access Private (User)
 */
router.post(
  '/verify-purchase',
  authenticateUser,
  [
    body('purchaseToken')
      .notEmpty()
      .withMessage('Purchase token is required'),
    body('productId')
      .notEmpty()
      .withMessage('Product ID is required'),
    body('appId')
      .isUUID()
      .withMessage('Valid app ID is required'),
    body('orderId')
      .notEmpty()
      .withMessage('Order ID is required'),
    body('type')
      .isIn(['subscription', 'one_time'])
      .withMessage('Type must be either subscription or one_time'),
  ],
  validateRequest,
  billingController.verifyPurchase
);

/**
 * @route POST /api/billing/webhook
 * @desc Handle Google Play webhook notifications
 * @access Public (Google Play)
 */
router.post(
  '/webhook',
  billingController.handleWebhook
);

/**
 * @route GET /api/billing/subscriptions
 * @desc Get user's subscriptions
 * @access Private (User)
 */
router.get(
  '/subscriptions',
  authenticateUser,
  [
    query('status')
      .optional()
      .isIn(['ACTIVE', 'CANCELLED', 'EXPIRED', 'ON_HOLD', 'GRACE_PERIOD', 'PAUSED'])
      .withMessage('Invalid status filter'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],
  validateRequest,
  billingController.getUserSubscriptions
);

/**
 * @route GET /api/billing/subscriptions/:subscriptionId
 * @desc Get subscription details
 * @access Private (User)
 */
router.get(
  '/subscriptions/:subscriptionId',
  authenticateUser,
  [
    param('subscriptionId')
      .isUUID()
      .withMessage('Valid subscription ID is required'),
  ],
  validateRequest,
  billingController.getSubscriptionDetails
);

/**
 * @route POST /api/billing/subscriptions/:subscriptionId/cancel
 * @desc Cancel a subscription
 * @access Private (User)
 */
router.post(
  '/subscriptions/:subscriptionId/cancel',
  authenticateUser,
  [
    param('subscriptionId')
      .isUUID()
      .withMessage('Valid subscription ID is required'),
    body('reason')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Reason must be a string with maximum 500 characters'),
  ],
  validateRequest,
  billingController.cancelSubscription
);

/**
 * @route GET /api/billing/transactions
 * @desc Get user's transaction history
 * @access Private (User)
 */
router.get(
  '/transactions',
  authenticateUser,
  [
    query('type')
      .optional()
      .isIn(['SUBSCRIPTION', 'ONE_TIME'])
      .withMessage('Invalid transaction type'),
    query('status')
      .optional()
      .isIn(['COMPLETED', 'CANCELLED', 'PENDING', 'FAILED'])
      .withMessage('Invalid transaction status'),
    query('appId')
      .optional()
      .isUUID()
      .withMessage('Valid app ID is required'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],
  validateRequest,
  billingController.getUserTransactions
);

/**
 * @route GET /api/billing/transactions/:transactionId
 * @desc Get transaction details
 * @access Private (User)
 */
router.get(
  '/transactions/:transactionId',
  authenticateUser,
  [
    param('transactionId')
      .isUUID()
      .withMessage('Valid transaction ID is required'),
  ],
  validateRequest,
  billingController.getTransactionDetails
);

/**
 * @route POST /api/billing/refund
 * @desc Request a refund
 * @access Private (User)
 */
router.post(
  '/refund',
  authenticateUser,
  [
    body('transactionId')
      .isUUID()
      .withMessage('Valid transaction ID is required'),
    body('reason')
      .notEmpty()
      .isString()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Reason must be between 10 and 1000 characters'),
    body('type')
      .isIn(['full', 'partial'])
      .withMessage('Refund type must be either full or partial'),
    body('amount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Amount must be a positive number'),
  ],
  validateRequest,
  billingController.requestRefund
);

// Admin routes
/**
 * @route GET /api/billing/admin/transactions
 * @desc Get all transactions (Admin)
 * @access Private (Admin)
 */
router.get(
  '/admin/transactions',
  authenticateAdmin,
  [
    query('userId')
      .optional()
      .isUUID()
      .withMessage('Valid user ID is required'),
    query('appId')
      .optional()
      .isUUID()
      .withMessage('Valid app ID is required'),
    query('developerId')
      .optional()
      .isUUID()
      .withMessage('Valid developer ID is required'),
    query('type')
      .optional()
      .isIn(['SUBSCRIPTION', 'ONE_TIME'])
      .withMessage('Invalid transaction type'),
    query('status')
      .optional()
      .isIn(['COMPLETED', 'CANCELLED', 'PENDING', 'FAILED'])
      .withMessage('Invalid transaction status'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],
  validateRequest,
  billingController.getAllTransactions
);

/**
 * @route GET /api/billing/admin/subscriptions
 * @desc Get all subscriptions (Admin)
 * @access Private (Admin)
 */
router.get(
  '/admin/subscriptions',
  authenticateAdmin,
  [
    query('userId')
      .optional()
      .isUUID()
      .withMessage('Valid user ID is required'),
    query('appId')
      .optional()
      .isUUID()
      .withMessage('Valid app ID is required'),
    query('developerId')
      .optional()
      .isUUID()
      .withMessage('Valid developer ID is required'),
    query('status')
      .optional()
      .isIn(['ACTIVE', 'CANCELLED', 'EXPIRED', 'ON_HOLD', 'GRACE_PERIOD', 'PAUSED'])
      .withMessage('Invalid status filter'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],
  validateRequest,
  billingController.getAllSubscriptions
);

/**
 * @route GET /api/billing/admin/revenue
 * @desc Get revenue analytics (Admin)
 * @access Private (Admin)
 */
router.get(
  '/admin/revenue',
  authenticateAdmin,
  [
    query('period')
      .optional()
      .isIn(['day', 'week', 'month', 'year'])
      .withMessage('Period must be day, week, month, or year'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    query('appId')
      .optional()
      .isUUID()
      .withMessage('Valid app ID is required'),
    query('developerId')
      .optional()
      .isUUID()
      .withMessage('Valid developer ID is required'),
  ],
  validateRequest,
  billingController.getRevenueAnalytics
);

/**
 * @route POST /api/billing/admin/refunds/:refundId/process
 * @desc Process a refund request (Admin)
 * @access Private (Admin)
 */
router.post(
  '/admin/refunds/:refundId/process',
  authenticateAdmin,
  [
    param('refundId')
      .isUUID()
      .withMessage('Valid refund ID is required'),
    body('action')
      .isIn(['approve', 'reject'])
      .withMessage('Action must be either approve or reject'),
    body('adminNotes')
      .optional()
      .isString()
      .isLength({ max: 1000 })
      .withMessage('Admin notes must be a string with maximum 1000 characters'),
  ],
  validateRequest,
  billingController.processRefund
);

/**
 * @route GET /api/billing/admin/refunds
 * @desc Get all refund requests (Admin)
 * @access Private (Admin)
 */
router.get(
  '/admin/refunds',
  authenticateAdmin,
  [
    query('status')
      .optional()
      .isIn(['PENDING', 'APPROVED', 'REJECTED', 'PROCESSED'])
      .withMessage('Invalid refund status'),
    query('userId')
      .optional()
      .isUUID()
      .withMessage('Valid user ID is required'),
    query('appId')
      .optional()
      .isUUID()
      .withMessage('Valid app ID is required'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],
  validateRequest,
  billingController.getAllRefunds
);

/**
 * @route POST /api/billing/admin/sync-subscriptions
 * @desc Sync all subscriptions with Google Play (Admin)
 * @access Private (Admin)
 */
router.post(
  '/admin/sync-subscriptions',
  authenticateAdmin,
  billingController.syncSubscriptions
);

export default router;