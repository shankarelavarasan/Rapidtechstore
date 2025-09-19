import express from 'express';
import { body, query, param } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest';
import { authenticateToken, authenticateDeveloper, authenticateAdmin } from '../middleware/auth';
import * as analyticsController from '../controllers/analyticsController';

const router = express.Router();

// Public analytics routes (limited data)
router.get(
  '/public/top-charts',
  [
    query('category').optional().isString().trim(),
    query('timeframe').optional().isIn(['daily', 'weekly', 'monthly', 'all-time']),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validateRequest,
  analyticsController.getPublicTopCharts
);

router.get(
  '/public/trending',
  [
    query('category').optional().isString().trim(),
    query('limit').optional().isInt({ min: 1, max: 20 }),
  ],
  validateRequest,
  analyticsController.getPublicTrending
);

router.get(
  '/public/platform-stats',
  analyticsController.getPublicPlatformStats
);

// Developer analytics routes
router.use('/developer', authenticateDeveloper);

router.get(
  '/developer/dashboard',
  [
    query('timeframe').optional().isIn(['7d', '30d', '90d', '1y']),
  ],
  validateRequest,
  analyticsController.getDeveloperDashboard
);

router.get(
  '/developer/apps/:appId/analytics',
  [
    param('appId').isUUID(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('metrics').optional().isString(),
  ],
  validateRequest,
  analyticsController.getAppAnalytics
);

router.get(
  '/developer/apps/:appId/performance',
  [
    param('appId').isUUID(),
    query('timeframe').optional().isIn(['24h', '7d', '30d']),
  ],
  validateRequest,
  analyticsController.getAppPerformance
);

router.get(
  '/developer/revenue',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('breakdown').optional().isIn(['daily', 'weekly', 'monthly']),
  ],
  validateRequest,
  analyticsController.getDeveloperRevenue
);

router.get(
  '/developer/audience',
  [
    query('appId').optional().isUUID(),
    query('timeframe').optional().isIn(['7d', '30d', '90d']),
  ],
  validateRequest,
  analyticsController.getDeveloperAudience
);

router.get(
  '/developer/conversion-funnel',
  [
    query('appId').optional().isUUID(),
    query('timeframe').optional().isIn(['7d', '30d', '90d']),
  ],
  validateRequest,
  analyticsController.getConversionFunnel
);

router.get(
  '/developer/retention',
  [
    query('appId').optional().isUUID(),
    query('cohortType').optional().isIn(['daily', 'weekly', 'monthly']),
  ],
  validateRequest,
  analyticsController.getRetentionAnalytics
);

// User analytics routes
router.use('/user', authenticateToken);

router.get(
  '/user/activity',
  [
    query('timeframe').optional().isIn(['7d', '30d', '90d']),
  ],
  validateRequest,
  analyticsController.getUserActivity
);

router.get(
  '/user/recommendations',
  [
    query('limit').optional().isInt({ min: 1, max: 20 }),
  ],
  validateRequest,
  analyticsController.getUserRecommendations
);

router.post(
  '/user/track-event',
  [
    body('eventType').isIn(['app_view', 'app_download', 'app_install', 'app_open', 'app_uninstall', 'search', 'category_browse']),
    body('appId').optional().isUUID(),
    body('metadata').optional().isObject(),
  ],
  validateRequest,
  analyticsController.trackUserEvent
);

// Admin analytics routes
router.use('/admin', authenticateAdmin);

router.get(
  '/admin/platform-overview',
  [
    query('timeframe').optional().isIn(['7d', '30d', '90d', '1y']),
  ],
  validateRequest,
  analyticsController.getPlatformOverview
);

router.get(
  '/admin/revenue-analytics',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('breakdown').optional().isIn(['daily', 'weekly', 'monthly']),
  ],
  validateRequest,
  analyticsController.getRevenueAnalytics
);

router.get(
  '/admin/user-analytics',
  [
    query('timeframe').optional().isIn(['7d', '30d', '90d', '1y']),
    query('segment').optional().isIn(['new', 'returning', 'premium', 'free']),
  ],
  validateRequest,
  analyticsController.getUserAnalytics
);

router.get(
  '/admin/developer-analytics',
  [
    query('timeframe').optional().isIn(['7d', '30d', '90d', '1y']),
    query('status').optional().isIn(['PENDING', 'VERIFIED', 'SUSPENDED']),
  ],
  validateRequest,
  analyticsController.getDeveloperAnalytics
);

router.get(
  '/admin/app-analytics',
  [
    query('timeframe').optional().isIn(['7d', '30d', '90d', '1y']),
    query('status').optional().isIn(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']),
    query('category').optional().isString(),
  ],
  validateRequest,
  analyticsController.getAppAnalytics
);

router.get(
  '/admin/performance-metrics',
  [
    query('timeframe').optional().isIn(['24h', '7d', '30d']),
  ],
  validateRequest,
  analyticsController.getPerformanceMetrics
);

router.get(
  '/admin/geographic-analytics',
  [
    query('timeframe').optional().isIn(['7d', '30d', '90d']),
    query('metric').optional().isIn(['users', 'downloads', 'revenue']),
  ],
  validateRequest,
  analyticsController.getGeographicAnalytics
);

router.get(
  '/admin/conversion-analytics',
  [
    query('timeframe').optional().isIn(['7d', '30d', '90d']),
  ],
  validateRequest,
  analyticsController.getConversionAnalytics
);

router.get(
  '/admin/cohort-analysis',
  [
    query('cohortType').optional().isIn(['daily', 'weekly', 'monthly']),
    query('metric').optional().isIn(['retention', 'revenue', 'engagement']),
  ],
  validateRequest,
  analyticsController.getCohortAnalysis
);

router.get(
  '/admin/real-time',
  analyticsController.getRealTimeAnalytics
);

// Analytics export routes
router.get(
  '/admin/export/revenue',
  [
    query('startDate').isISO8601(),
    query('endDate').isISO8601(),
    query('format').optional().isIn(['csv', 'xlsx', 'json']),
  ],
  validateRequest,
  analyticsController.exportRevenueData
);

router.get(
  '/admin/export/users',
  [
    query('startDate').isISO8601(),
    query('endDate').isISO8601(),
    query('format').optional().isIn(['csv', 'xlsx', 'json']),
    query('segment').optional().isString(),
  ],
  validateRequest,
  analyticsController.exportUserData
);

router.get(
  '/admin/export/apps',
  [
    query('startDate').isISO8601(),
    query('endDate').isISO8601(),
    query('format').optional().isIn(['csv', 'xlsx', 'json']),
    query('category').optional().isString(),
  ],
  validateRequest,
  analyticsController.exportAppData
);

// Custom analytics and reports
router.post(
  '/admin/custom-report',
  [
    body('name').isString().trim().isLength({ min: 1, max: 100 }),
    body('description').optional().isString().trim(),
    body('metrics').isArray().notEmpty(),
    body('filters').optional().isObject(),
    body('timeframe').isObject(),
    body('schedule').optional().isObject(),
  ],
  validateRequest,
  analyticsController.createCustomReport
);

router.get(
  '/admin/custom-reports',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  analyticsController.getCustomReports
);

router.get(
  '/admin/custom-reports/:reportId',
  [
    param('reportId').isUUID(),
  ],
  validateRequest,
  analyticsController.getCustomReport
);

router.put(
  '/admin/custom-reports/:reportId',
  [
    param('reportId').isUUID(),
    body('name').optional().isString().trim().isLength({ min: 1, max: 100 }),
    body('description').optional().isString().trim(),
    body('metrics').optional().isArray(),
    body('filters').optional().isObject(),
    body('timeframe').optional().isObject(),
    body('schedule').optional().isObject(),
  ],
  validateRequest,
  analyticsController.updateCustomReport
);

router.delete(
  '/admin/custom-reports/:reportId',
  [
    param('reportId').isUUID(),
  ],
  validateRequest,
  analyticsController.deleteCustomReport
);

router.post(
  '/admin/custom-reports/:reportId/generate',
  [
    param('reportId').isUUID(),
  ],
  validateRequest,
  analyticsController.generateCustomReport
);

// Analytics alerts and notifications
router.post(
  '/admin/alerts',
  [
    body('name').isString().trim().isLength({ min: 1, max: 100 }),
    body('metric').isString().trim(),
    body('condition').isIn(['greater_than', 'less_than', 'equals', 'percentage_change']),
    body('threshold').isNumeric(),
    body('timeframe').isString().trim(),
    body('notifications').isArray().notEmpty(),
  ],
  validateRequest,
  analyticsController.createAlert
);

router.get(
  '/admin/alerts',
  [
    query('status').optional().isIn(['active', 'inactive', 'triggered']),
  ],
  validateRequest,
  analyticsController.getAlerts
);

router.put(
  '/admin/alerts/:alertId',
  [
    param('alertId').isUUID(),
    body('name').optional().isString().trim(),
    body('threshold').optional().isNumeric(),
    body('status').optional().isIn(['active', 'inactive']),
  ],
  validateRequest,
  analyticsController.updateAlert
);

router.delete(
  '/admin/alerts/:alertId',
  [
    param('alertId').isUUID(),
  ],
  validateRequest,
  analyticsController.deleteAlert
);

export default router;