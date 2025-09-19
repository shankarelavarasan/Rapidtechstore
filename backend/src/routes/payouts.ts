import express from 'express';
import { body, query, param } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest';
import { authenticateDeveloper, authenticateAdmin } from '../middleware/auth';
import * as payoutController from '../controllers/payoutController';

const router = express.Router();

// Developer payout routes
router.use('/developer', authenticateDeveloper);

router.get(
  '/developer/earnings',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  validateRequest,
  payoutController.getDeveloperEarnings
);

router.post(
  '/developer/request',
  [
    body('amount').isFloat({ min: 1 }),
    body('currency').isIn(['USD', 'EUR', 'GBP', 'INR']),
    body('method').isIn(['razorpay', 'payoneer', 'bank_transfer']),
    body('accountDetails').isObject(),
  ],
  validateRequest,
  payoutController.requestPayout
);

router.get(
  '/developer/history',
  [
    query('status').optional().isIn(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  payoutController.getDeveloperPayouts
);

router.get(
  '/developer/:payoutId/status',
  [
    param('payoutId').isUUID(),
  ],
  validateRequest,
  payoutController.getPayoutStatus
);

router.put(
  '/developer/account-details',
  [
    body('method').isIn(['razorpay', 'payoneer', 'bank_transfer']),
    body('accountDetails').isObject(),
  ],
  validateRequest,
  payoutController.updatePayoutAccountDetails
);

router.put(
  '/developer/auto-payout',
  [
    body('enabled').isBoolean(),
    body('threshold').optional().isFloat({ min: 10 }),
    body('interval').optional().isInt({ min: 1, max: 30 }),
  ],
  validateRequest,
  payoutController.updateAutoPayoutSettings
);

router.get(
  '/developer/account-details',
  payoutController.getPayoutAccountDetails
);

router.get(
  '/developer/auto-payout',
  payoutController.getAutoPayoutSettings
);

// Admin payout routes
router.use('/admin', authenticateAdmin);

router.get(
  '/admin/analytics',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  validateRequest,
  payoutController.getPayoutAnalytics
);

router.get(
  '/admin/all',
  [
    query('status').optional().isIn(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']),
    query('method').optional().isIn(['razorpay', 'payoneer', 'bank_transfer']),
    query('developerId').optional().isUUID(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sortBy').optional().isIn(['requestedAt', 'amount', 'status']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
  ],
  validateRequest,
  payoutController.getAllPayouts
);

router.get(
  '/admin/:payoutId',
  [
    param('payoutId').isUUID(),
  ],
  validateRequest,
  payoutController.getPayoutDetails
);

router.put(
  '/admin/:payoutId/approve',
  [
    param('payoutId').isUUID(),
    body('notes').optional().isString().trim(),
  ],
  validateRequest,
  payoutController.approvePayout
);

router.put(
  '/admin/:payoutId/reject',
  [
    param('payoutId').isUUID(),
    body('reason').isString().trim().isLength({ min: 10 }),
    body('notes').optional().isString().trim(),
  ],
  validateRequest,
  payoutController.rejectPayout
);

router.post(
  '/admin/bulk-process',
  [
    body('payoutIds').isArray().notEmpty(),
    body('payoutIds.*').isUUID(),
    body('action').isIn(['approve', 'reject']),
    body('reason').optional().isString().trim(),
    body('notes').optional().isString().trim(),
  ],
  validateRequest,
  payoutController.bulkProcessPayouts
);

router.post(
  '/admin/manual-payout',
  [
    body('developerId').isUUID(),
    body('amount').isFloat({ min: 1 }),
    body('currency').isIn(['USD', 'EUR', 'GBP', 'INR']),
    body('method').isIn(['razorpay', 'payoneer', 'bank_transfer']),
    body('reason').isString().trim(),
    body('notes').optional().isString().trim(),
  ],
  validateRequest,
  payoutController.createManualPayout
);

router.get(
  '/admin/pending-approvals',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  payoutController.getPendingApprovals
);

router.get(
  '/admin/failed-payouts',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  payoutController.getFailedPayouts
);

router.post(
  '/admin/retry-failed',
  [
    body('payoutIds').isArray().notEmpty(),
    body('payoutIds.*').isUUID(),
  ],
  validateRequest,
  payoutController.retryFailedPayouts
);

router.get(
  '/admin/developer/:developerId/earnings',
  [
    param('developerId').isUUID(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  validateRequest,
  payoutController.getDeveloperEarningsAdmin
);

router.get(
  '/admin/developer/:developerId/payouts',
  [
    param('developerId').isUUID(),
    query('status').optional().isIn(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  payoutController.getDeveloperPayoutsAdmin
);

router.put(
  '/admin/developer/:developerId/auto-payout',
  [
    param('developerId').isUUID(),
    body('enabled').isBoolean(),
    body('threshold').optional().isFloat({ min: 10 }),
    body('interval').optional().isInt({ min: 1, max: 30 }),
  ],
  validateRequest,
  payoutController.updateDeveloperAutoPayoutSettings
);

router.get(
  '/admin/revenue-summary',
  [
    query('timeframe').optional().isIn(['7d', '30d', '90d', '1y']),
  ],
  validateRequest,
  payoutController.getRevenueSummary
);

router.get(
  '/admin/top-earners',
  [
    query('timeframe').optional().isIn(['7d', '30d', '90d', '1y']),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validateRequest,
  payoutController.getTopEarners
);

router.get(
  '/admin/payout-trends',
  [
    query('timeframe').optional().isIn(['7d', '30d', '90d', '1y']),
    query('breakdown').optional().isIn(['daily', 'weekly', 'monthly']),
  ],
  validateRequest,
  payoutController.getPayoutTrends
);

router.post(
  '/admin/export',
  [
    body('startDate').isISO8601(),
    body('endDate').isISO8601(),
    body('format').optional().isIn(['csv', 'xlsx', 'json']),
    body('filters').optional().isObject(),
  ],
  validateRequest,
  payoutController.exportPayoutData
);

// Webhook routes for payment providers
router.post(
  '/webhooks/razorpay',
  payoutController.handleRazorpayWebhook
);

router.post(
  '/webhooks/payoneer',
  payoutController.handlePayoneerWebhook
);

// System routes for automated processing
router.post(
  '/system/process-automatic',
  [
    body('systemKey').equals(process.env.SYSTEM_KEY || 'default-system-key'),
  ],
  validateRequest,
  payoutController.processAutomaticPayouts
);

router.post(
  '/system/sync-statuses',
  [
    body('systemKey').equals(process.env.SYSTEM_KEY || 'default-system-key'),
  ],
  validateRequest,
  payoutController.syncPayoutStatuses
);

export default router;