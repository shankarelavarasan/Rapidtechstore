import express from 'express';
import { body, query, param } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest';
import { authenticateAdmin, requireAdminRole } from '../middleware/auth';
import * as adminController from '../controllers/adminController';

const router = express.Router();

// Admin authentication routes
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
  ],
  validateRequest,
  adminController.loginAdmin
);

// All routes below require admin authentication
router.use(authenticateAdmin);

// Dashboard stats
router.get('/dashboard', adminController.getDashboardStats);

// Developer management
router.get(
  '/developers',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['PENDING_EMAIL', 'PENDING_DOMAIN', 'PENDING_REVIEW', 'APPROVED', 'REJECTED']),
    query('search').optional().isString(),
  ],
  validateRequest,
  adminController.getDevelopers
);

router.get(
  '/developers/:id',
  [param('id').isUUID()],
  validateRequest,
  adminController.getDeveloperById
);

router.patch(
  '/developers/:id/approve',
  [
    param('id').isUUID(),
    body('notes').optional().isString(),
  ],
  validateRequest,
  requireAdminRole(['SUPER_ADMIN', 'ADMIN']),
  adminController.approveDeveloper
);

router.patch(
  '/developers/:id/reject',
  [
    param('id').isUUID(),
    body('reason').isString().isLength({ min: 10 }),
    body('notes').optional().isString(),
  ],
  validateRequest,
  requireAdminRole(['SUPER_ADMIN', 'ADMIN']),
  adminController.rejectDeveloper
);

router.patch(
  '/developers/:id/suspend',
  [
    param('id').isUUID(),
    body('reason').isString().isLength({ min: 10 }),
  ],
  validateRequest,
  requireAdminRole(['SUPER_ADMIN', 'ADMIN']),
  adminController.suspendDeveloper
);

router.patch(
  '/developers/:id/activate',
  [param('id').isUUID()],
  validateRequest,
  requireAdminRole(['SUPER_ADMIN', 'ADMIN']),
  adminController.activateDeveloper
);

// App management
router.get(
  '/apps',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED']),
    query('category').optional().isString(),
    query('search').optional().isString(),
  ],
  validateRequest,
  adminController.getApps
);

router.get(
  '/apps/:id',
  [param('id').isUUID()],
  validateRequest,
  adminController.getAppById
);

router.patch(
  '/apps/:id/approve',
  [
    param('id').isUUID(),
    body('notes').optional().isString(),
  ],
  validateRequest,
  requireAdminRole(['SUPER_ADMIN', 'ADMIN']),
  adminController.approveApp
);

router.patch(
  '/apps/:id/reject',
  [
    param('id').isUUID(),
    body('reason').isString().isLength({ min: 10 }),
    body('notes').optional().isString(),
  ],
  validateRequest,
  requireAdminRole(['SUPER_ADMIN', 'ADMIN']),
  adminController.rejectApp
);

router.patch(
  '/apps/:id/suspend',
  [
    param('id').isUUID(),
    body('reason').isString().isLength({ min: 10 }),
  ],
  validateRequest,
  requireAdminRole(['SUPER_ADMIN', 'ADMIN']),
  adminController.suspendApp
);

router.patch(
  '/apps/:id/feature',
  [
    param('id').isUUID(),
    body('featured').isBoolean(),
    body('featuredUntil').optional().isISO8601(),
  ],
  validateRequest,
  requireAdminRole(['SUPER_ADMIN', 'ADMIN']),
  adminController.featureApp
);

// User management
router.get(
  '/users',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString(),
  ],
  validateRequest,
  adminController.getUsers
);

router.get(
  '/users/:id',
  [param('id').isUUID()],
  validateRequest,
  adminController.getUserById
);

router.patch(
  '/users/:id/suspend',
  [
    param('id').isUUID(),
    body('reason').isString().isLength({ min: 10 }),
  ],
  validateRequest,
  requireAdminRole(['SUPER_ADMIN', 'ADMIN']),
  adminController.suspendUser
);

// Analytics
router.get('/analytics/overview', adminController.getAnalyticsOverview);

router.get(
  '/analytics/revenue',
  [
    query('period').optional().isIn(['7d', '30d', '90d', '1y']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  validateRequest,
  adminController.getRevenueAnalytics
);

router.get(
  '/analytics/apps',
  [
    query('period').optional().isIn(['7d', '30d', '90d', '1y']),
    query('category').optional().isString(),
  ],
  validateRequest,
  adminController.getAppAnalytics
);

// Payout management
router.get(
  '/payouts',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']),
    query('developerId').optional().isUUID(),
  ],
  validateRequest,
  adminController.getPayouts
);

router.post(
  '/payouts/process',
  [
    body('month').isInt({ min: 1, max: 12 }),
    body('year').isInt({ min: 2020 }),
  ],
  validateRequest,
  requireAdminRole(['SUPER_ADMIN', 'ADMIN']),
  adminController.processPayouts
);

router.patch(
  '/payouts/:id/retry',
  [param('id').isUUID()],
  validateRequest,
  requireAdminRole(['SUPER_ADMIN', 'ADMIN']),
  adminController.retryPayout
);

// System configuration
router.get('/config', adminController.getSystemConfig);

router.patch(
  '/config',
  [
    body('maintenanceMode').optional().isBoolean(),
    body('allowNewRegistrations').optional().isBoolean(),
    body('featuredAppsLimit').optional().isInt({ min: 1, max: 20 }),
    body('commissionRate').optional().isFloat({ min: 0, max: 1 }),
    body('minimumPayoutAmount').optional().isFloat({ min: 0 }),
  ],
  validateRequest,
  requireAdminRole(['SUPER_ADMIN']),
  adminController.updateSystemConfig
);

// Reports
router.get(
  '/reports/revenue',
  [
    query('startDate').isISO8601(),
    query('endDate').isISO8601(),
    query('format').optional().isIn(['json', 'csv']),
  ],
  validateRequest,
  requireAdminRole(['SUPER_ADMIN', 'ADMIN']),
  adminController.generateRevenueReport
);

router.get(
  '/reports/developers',
  [
    query('format').optional().isIn(['json', 'csv']),
  ],
  validateRequest,
  requireAdminRole(['SUPER_ADMIN', 'ADMIN']),
  adminController.generateDeveloperReport
);

// Admin management (Super Admin only)
router.get(
  '/admins',
  requireAdminRole(['SUPER_ADMIN']),
  adminController.getAdmins
);

router.post(
  '/admins',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('firstName').isString().isLength({ min: 1 }),
    body('lastName').isString().isLength({ min: 1 }),
    body('role').isIn(['ADMIN', 'MODERATOR']),
  ],
  validateRequest,
  requireAdminRole(['SUPER_ADMIN']),
  adminController.createAdmin
);

router.patch(
  '/admins/:id',
  [
    param('id').isUUID(),
    body('firstName').optional().isString().isLength({ min: 1 }),
    body('lastName').optional().isString().isLength({ min: 1 }),
    body('role').optional().isIn(['ADMIN', 'MODERATOR']),
    body('isActive').optional().isBoolean(),
  ],
  validateRequest,
  requireAdminRole(['SUPER_ADMIN']),
  adminController.updateAdmin
);

router.delete(
  '/admins/:id',
  [param('id').isUUID()],
  validateRequest,
  requireAdminRole(['SUPER_ADMIN']),
  adminController.deleteAdmin
);

export default router;