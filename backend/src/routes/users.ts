import express from 'express';
import { body, query, param } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest';
import { authenticateUser, optionalAuth } from '../middleware/auth';
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  getUserSubscriptions,
  getUserDownloads,
  getUserFavorites,
  addToFavorites,
  removeFromFavorites,
  getUserReviews,
  createReview,
  updateReview,
  deleteReview,
  downloadApp,
  subscribeToApp,
  unsubscribeFromApp,
  getUserAnalytics,
  deleteUserAccount,
} from '../controllers/userController';

const router = express.Router();

// Authentication routes
router.post(
  '/register',
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    body('dateOfBirth')
      .optional()
      .isISO8601()
      .withMessage('Please provide a valid date of birth'),
    body('country')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Country must be between 2 and 50 characters'),
  ],
  validateRequest,
  registerUser
);

router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],
  validateRequest,
  loginUser
);

// Password management
router.post(
  '/forgot-password',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
  ],
  validateRequest,
  forgotPassword
);

router.post(
  '/reset-password',
  [
    body('token')
      .notEmpty()
      .withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  ],
  validateRequest,
  resetPassword
);

// Protected routes (require authentication)
router.use(authenticateUser);

// Profile management
router.get('/profile', getUserProfile);

router.put(
  '/profile',
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
    body('dateOfBirth')
      .optional()
      .isISO8601()
      .withMessage('Please provide a valid date of birth'),
    body('country')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Country must be between 2 and 50 characters'),
    body('preferences')
      .optional()
      .isObject()
      .withMessage('Preferences must be an object'),
  ],
  validateRequest,
  updateUserProfile
);

router.post(
  '/change-password',
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
  ],
  validateRequest,
  changePassword
);

// Subscription management
router.get(
  '/subscriptions',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('status')
      .optional()
      .isIn(['ACTIVE', 'CANCELLED', 'EXPIRED'])
      .withMessage('Status must be ACTIVE, CANCELLED, or EXPIRED'),
  ],
  validateRequest,
  getUserSubscriptions
);

router.post(
  '/subscribe/:appId',
  [
    param('appId')
      .isUUID()
      .withMessage('Invalid app ID'),
    body('purchaseToken')
      .notEmpty()
      .withMessage('Purchase token is required'),
    body('productId')
      .notEmpty()
      .withMessage('Product ID is required'),
    body('orderId')
      .notEmpty()
      .withMessage('Order ID is required'),
  ],
  validateRequest,
  subscribeToApp
);

router.delete(
  '/subscribe/:appId',
  [
    param('appId')
      .isUUID()
      .withMessage('Invalid app ID'),
  ],
  validateRequest,
  unsubscribeFromApp
);

// Download management
router.get(
  '/downloads',
  [
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
  getUserDownloads
);

router.post(
  '/download/:appId',
  [
    param('appId')
      .isUUID()
      .withMessage('Invalid app ID'),
  ],
  validateRequest,
  downloadApp
);

// Favorites management
router.get(
  '/favorites',
  [
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
  getUserFavorites
);

router.post(
  '/favorites/:appId',
  [
    param('appId')
      .isUUID()
      .withMessage('Invalid app ID'),
  ],
  validateRequest,
  addToFavorites
);

router.delete(
  '/favorites/:appId',
  [
    param('appId')
      .isUUID()
      .withMessage('Invalid app ID'),
  ],
  validateRequest,
  removeFromFavorites
);

// Reviews management
router.get(
  '/reviews',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('appId')
      .optional()
      .isUUID()
      .withMessage('Invalid app ID'),
  ],
  validateRequest,
  getUserReviews
);

router.post(
  '/reviews/:appId',
  [
    param('appId')
      .isUUID()
      .withMessage('Invalid app ID'),
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    body('comment')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Comment must not exceed 1000 characters'),
  ],
  validateRequest,
  createReview
);

router.put(
  '/reviews/:reviewId',
  [
    param('reviewId')
      .isUUID()
      .withMessage('Invalid review ID'),
    body('rating')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    body('comment')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Comment must not exceed 1000 characters'),
  ],
  validateRequest,
  updateReview
);

router.delete(
  '/reviews/:reviewId',
  [
    param('reviewId')
      .isUUID()
      .withMessage('Invalid review ID'),
  ],
  validateRequest,
  deleteReview
);

// Analytics
router.get('/analytics', getUserAnalytics);

// Account management
router.delete(
  '/account',
  [
    body('password')
      .notEmpty()
      .withMessage('Password is required to delete account'),
    body('confirmation')
      .equals('DELETE_MY_ACCOUNT')
      .withMessage('Please type DELETE_MY_ACCOUNT to confirm'),
  ],
  validateRequest,
  deleteUserAccount
);

export default router;