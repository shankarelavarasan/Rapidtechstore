import express from 'express';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest';
import { authenticateDeveloper } from '../middleware/auth';
import * as verificationController from '../controllers/verificationController';

const router = express.Router();

// Generate domain verification token
router.post(
  '/domain/generate-token',
  authenticateDeveloper,
  [
    body('website')
      .isURL({ require_protocol: true })
      .withMessage('Valid website URL is required'),
    body('method')
      .isIn(['dns', 'meta'])
      .withMessage('Verification method must be either "dns" or "meta"'),
  ],
  validateRequest,
  verificationController.generateDomainVerificationToken
);

// Verify domain ownership
router.post(
  '/domain/verify',
  authenticateDeveloper,
  verificationController.verifyDomainOwnership
);

// Check verification status
router.get(
  '/domain/status',
  authenticateDeveloper,
  verificationController.getDomainVerificationStatus
);

// Resend email verification
router.post(
  '/email/resend',
  authenticateDeveloper,
  verificationController.resendEmailVerification
);

// Verify email token
router.get(
  '/email/verify/:token',
  [
    param('token')
      .isLength({ min: 32 })
      .withMessage('Invalid verification token'),
  ],
  validateRequest,
  verificationController.verifyEmailToken
);

// Admin routes for manual verification
router.post(
  '/admin/approve/:developerId',
  // authenticateAdmin, // TODO: Implement admin auth
  [
    param('developerId')
      .isUUID()
      .withMessage('Invalid developer ID'),
  ],
  validateRequest,
  verificationController.approveDeveloper
);

router.post(
  '/admin/reject/:developerId',
  // authenticateAdmin, // TODO: Implement admin auth
  [
    param('developerId')
      .isUUID()
      .withMessage('Invalid developer ID'),
    body('reason')
      .notEmpty()
      .withMessage('Rejection reason is required'),
  ],
  validateRequest,
  verificationController.rejectDeveloper
);

// Get pending applications for admin review
router.get(
  '/admin/pending',
  // authenticateAdmin, // TODO: Implement admin auth
  verificationController.getPendingApplications
);

// New comprehensive verification routes using VerificationProof model

// Initiate comprehensive verification (DNS, meta tag, or file upload)
router.post(
  '/comprehensive/initiate',
  authenticateDeveloper,
  [
    body('appId')
      .isUUID()
      .withMessage('Valid app ID is required'),
    body('domain')
      .isFQDN()
      .withMessage('Valid domain is required'),
    body('verificationType')
      .isIn(['DNS', 'META_TAG', 'FILE_UPLOAD'])
      .withMessage('Verification type must be DNS, META_TAG, or FILE_UPLOAD'),
  ],
  validateRequest,
  verificationController.initiateComprehensiveVerification
);

// Verify comprehensive ownership
router.post(
  '/comprehensive/verify',
  authenticateDeveloper,
  [
    body('verificationId')
      .isUUID()
      .withMessage('Valid verification ID is required'),
  ],
  validateRequest,
  verificationController.verifyComprehensiveOwnership
);

// Get comprehensive verification status
router.get(
  '/comprehensive/status/:verificationId',
  authenticateDeveloper,
  [
    param('verificationId')
      .isUUID()
      .withMessage('Valid verification ID is required'),
  ],
  validateRequest,
  verificationController.getComprehensiveVerificationStatus
);

// List all comprehensive verifications for developer
router.get(
  '/comprehensive/list',
  authenticateDeveloper,
  verificationController.listComprehensiveVerifications
);

// Delete comprehensive verification
router.delete(
  '/comprehensive/:verificationId',
  authenticateDeveloper,
  [
    param('verificationId')
      .isUUID()
      .withMessage('Valid verification ID is required'),
  ],
  validateRequest,
  verificationController.deleteComprehensiveVerification
);

export default router;