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

export default router;