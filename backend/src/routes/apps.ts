import express from 'express';
import { body, query, param } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest';
import { authenticateDeveloper, requireApprovedDeveloper, optionalAuth } from '../middleware/auth';
import * as appController from '../controllers/appController';

const router = express.Router();

// Public routes (no authentication required)
router.get(
  '/public',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('category').optional().isString(),
    query('search').optional().isString(),
    query('featured').optional().isBoolean(),
    query('sortBy').optional().isIn(['downloads', 'rating', 'price', 'newest']),
  ],
  validateRequest,
  optionalAuth,
  appController.getPublicApps
);

router.get(
  '/public/:id',
  [param('id').isUUID()],
  validateRequest,
  optionalAuth,
  appController.getPublicAppById
);

router.get('/categories', appController.getCategories);

router.get('/featured', appController.getFeaturedApps);

router.get(
  '/top-charts',
  [
    query('type').optional().isIn(['free', 'paid', 'grossing']),
    query('category').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validateRequest,
  appController.getTopCharts
);

// Developer routes (require authentication)
router.use(authenticateDeveloper);

// Create new app (AI conversion)
router.post(
  '/',
  [
    body('websiteUrl').isURL(),
    body('name').isString().isLength({ min: 1, max: 100 }),
    body('description').isString().isLength({ min: 10, max: 1000 }),
    body('category').isString(),
    body('price').isFloat({ min: 0 }),
    body('subscriptionType').optional().isIn(['FREE', 'ONE_TIME', 'MONTHLY', 'YEARLY']),
    body('tags').optional().isArray(),
    body('screenshots').optional().isArray(),
  ],
  validateRequest,
  requireApprovedDeveloper,
  appController.createApp
);

// Get developer's apps
router.get(
  '/my-apps',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED']),
    query('search').optional().isString(),
  ],
  validateRequest,
  appController.getDeveloperApps
);

// Get specific app by developer
router.get(
  '/:id',
  [param('id').isUUID()],
  validateRequest,
  appController.getDeveloperAppById
);

// Update app
router.patch(
  '/:id',
  [
    param('id').isUUID(),
    body('name').optional().isString().isLength({ min: 1, max: 100 }),
    body('description').optional().isString().isLength({ min: 10, max: 1000 }),
    body('category').optional().isString(),
    body('price').optional().isFloat({ min: 0 }),
    body('subscriptionType').optional().isIn(['FREE', 'ONE_TIME', 'MONTHLY', 'YEARLY']),
    body('tags').optional().isArray(),
    body('screenshots').optional().isArray(),
  ],
  validateRequest,
  appController.updateApp
);

// Submit app for review
router.post(
  '/:id/submit',
  [param('id').isUUID()],
  validateRequest,
  appController.submitAppForReview
);

// Regenerate app (re-run AI conversion)
router.post(
  '/:id/regenerate',
  [param('id').isUUID()],
  validateRequest,
  appController.regenerateApp
);

// Preview app
router.get(
  '/:id/preview',
  [param('id').isUUID()],
  validateRequest,
  appController.getAppPreview
);

// Approve preview (developer confirms the AI-generated app)
router.post(
  '/:id/approve-preview',
  [param('id').isUUID()],
  validateRequest,
  appController.approvePreview
);

// Get app analytics
router.get(
  '/:id/analytics',
  [
    param('id').isUUID(),
    query('period').optional().isIn(['7d', '30d', '90d', '1y']),
    query('metric').optional().isIn(['downloads', 'revenue', 'ratings']),
  ],
  validateRequest,
  appController.getAppAnalytics
);

// Get app reviews
router.get(
  '/:id/reviews',
  [
    param('id').isUUID(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('rating').optional().isInt({ min: 1, max: 5 }),
  ],
  validateRequest,
  appController.getAppReviews
);

// Delete app
router.delete(
  '/:id',
  [param('id').isUUID()],
  validateRequest,
  appController.deleteApp
);

export default router;