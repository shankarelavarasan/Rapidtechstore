import express from 'express';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest';
import { authenticateDeveloper } from '../middleware/auth';
import * as developerController from '../controllers/developerController';

const router = express.Router();

// Developer registration
router.post(
  '/register',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    body('companyName')
      .notEmpty()
      .withMessage('Company name is required'),
    body('businessEmail')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid business email is required'),
    body('website')
      .isURL({ require_protocol: true })
      .withMessage('Valid website URL is required'),
    body('phoneNumber')
      .isMobilePhone('any')
      .withMessage('Valid phone number is required'),
    body('address')
      .isObject()
      .withMessage('Address object is required'),
    body('address.street')
      .notEmpty()
      .withMessage('Street address is required'),
    body('address.city')
      .notEmpty()
      .withMessage('City is required'),
    body('address.state')
      .notEmpty()
      .withMessage('State is required'),
    body('address.country')
      .notEmpty()
      .withMessage('Country is required'),
    body('address.zipCode')
      .notEmpty()
      .withMessage('ZIP code is required'),
    body('gstNumber')
      .optional()
      .isLength({ min: 15, max: 15 })
      .withMessage('GST number must be 15 characters'),
    body('taxId')
      .optional()
      .notEmpty()
      .withMessage('Tax ID cannot be empty if provided'),
  ],
  validateRequest,
  developerController.registerDeveloper
);

// Developer login
router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],
  validateRequest,
  developerController.loginDeveloper
);

// Get developer profile
router.get(
  '/profile',
  authenticateDeveloper,
  developerController.getDeveloperProfile
);

// Update developer profile
router.put(
  '/profile',
  authenticateDeveloper,
  [
    body('companyName')
      .optional()
      .notEmpty()
      .withMessage('Company name cannot be empty'),
    body('businessEmail')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid business email is required'),
    body('website')
      .optional()
      .isURL({ require_protocol: true })
      .withMessage('Valid website URL is required'),
    body('phoneNumber')
      .optional()
      .isMobilePhone('any')
      .withMessage('Valid phone number is required'),
    body('address')
      .optional()
      .isObject()
      .withMessage('Address must be an object'),
  ],
  validateRequest,
  developerController.updateDeveloperProfile
);

// Update bank details
router.put(
  '/bank-details',
  authenticateDeveloper,
  [
    body('bankDetails')
      .isObject()
      .withMessage('Bank details object is required'),
    body('bankDetails.accountNumber')
      .notEmpty()
      .withMessage('Account number is required'),
    body('bankDetails.routingNumber')
      .notEmpty()
      .withMessage('Routing number is required'),
    body('bankDetails.accountHolderName')
      .notEmpty()
      .withMessage('Account holder name is required'),
    body('bankDetails.bankName')
      .notEmpty()
      .withMessage('Bank name is required'),
    body('payoutMethod')
      .isIn(['BANK_TRANSFER', 'PAYONEER', 'STRIPE'])
      .withMessage('Invalid payout method'),
    body('payoneerEmail')
      .optional()
      .isEmail()
      .withMessage('Valid Payoneer email is required'),
  ],
  validateRequest,
  developerController.updateBankDetails
);

// Get developer dashboard stats
router.get(
  '/dashboard',
  authenticateDeveloper,
  developerController.getDeveloperDashboard
);

// Get developer apps
router.get(
  '/apps',
  authenticateDeveloper,
  developerController.getDeveloperApps
);

// Get developer analytics
router.get(
  '/analytics',
  authenticateDeveloper,
  developerController.getDeveloperAnalytics
);

// Get developer payouts
router.get(
  '/payouts',
  authenticateDeveloper,
  developerController.getDeveloperPayouts
);

// Request password reset
router.post(
  '/forgot-password',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
  ],
  validateRequest,
  developerController.forgotPassword
);

// Reset password
router.post(
  '/reset-password',
  [
    body('token')
      .notEmpty()
      .withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  ],
  validateRequest,
  developerController.resetPassword
);

// Change password
router.put(
  '/change-password',
  authenticateDeveloper,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  ],
  validateRequest,
  developerController.changePassword
);

export default router;