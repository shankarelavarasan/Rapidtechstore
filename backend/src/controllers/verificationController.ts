import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as dns from 'dns';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../utils/logger';
import { sendEmail } from '../services/emailService';
import { createAppError } from '../middleware/errorHandler';
import { ownerVerificationService, VerificationRequest } from '../services/ownerVerificationService';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  developer?: {
    id: string;
    email: string;
  };
}

// Generate domain verification token
export const generateDomainVerificationToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { website, method } = req.body;
    const developerId = req.developer?.id;

    if (!developerId) {
      return next(createAppError('Developer not authenticated', 401));
    }

    // Generate unique verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Update developer with verification details
    const developer = await prisma.developer.update({
      where: { id: developerId },
      data: {
        website,
        domainVerificationMethod: method,
        domainVerificationToken: verificationToken,
        isDomainVerified: false,
      },
    });

    // Prepare verification instructions based on method
    let instructions = '';
    if (method === 'dns') {
      instructions = `Add the following TXT record to your domain's DNS settings:
      
Name: _rapidtech-verification
Value: ${verificationToken}
TTL: 300 (or default)

After adding the record, click "Verify Domain" to complete the verification process.`;
    } else if (method === 'meta') {
      instructions = `Add the following meta tag to your website's homepage <head> section:

<meta name="rapidtech-site-verification" content="${verificationToken}" />

After adding the meta tag, click "Verify Domain" to complete the verification process.`;
    }

    res.status(200).json({
      success: true,
      data: {
        token: verificationToken,
        method,
        website,
        instructions,
      },
    });
  } catch (error) {
    logger.error('Error generating domain verification token:', error);
    next(error);
  }
};

// Verify domain ownership
export const verifyDomainOwnership = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const developerId = req.developer?.id;

    if (!developerId) {
      return next(createAppError('Developer not authenticated', 401));
    }

    const developer = await prisma.developer.findUnique({
      where: { id: developerId },
    });

    if (!developer) {
      return next(createAppError('Developer not found', 404));
    }

    if (!developer.domainVerificationToken || !developer.website) {
      return next(createAppError('Domain verification not initiated', 400));
    }

    let isVerified = false;
    const method = developer.domainVerificationMethod;
    const token = developer.domainVerificationToken;
    const website = developer.website;

    try {
      if (method === 'dns') {
        isVerified = await verifyDNSRecord(website, token);
      } else if (method === 'meta') {
        isVerified = await verifyMetaTag(website, token);
      }
    } catch (verificationError) {
      logger.error('Domain verification failed:', verificationError);
      return res.status(400).json({
        success: false,
        error: 'Domain verification failed. Please check your configuration and try again.',
      });
    }

    if (isVerified) {
      // Update developer verification status
      await prisma.developer.update({
        where: { id: developerId },
        data: {
          isDomainVerified: true,
          verificationStatus: 'PENDING', // Ready for human review
        },
      });

      // Send notification to admin for review
      await notifyAdminForReview(developer);

      res.status(200).json({
        success: true,
        message: 'Domain verification successful! Your application is now pending review.',
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Domain verification failed. Please check your configuration and try again.',
      });
    }
  } catch (error) {
    logger.error('Error verifying domain ownership:', error);
    next(error);
  }
};

// Get domain verification status
export const getDomainVerificationStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const developerId = req.developer?.id;

    if (!developerId) {
      return next(createAppError('Developer not authenticated', 401));
    }

    const developer = await prisma.developer.findUnique({
      where: { id: developerId },
      select: {
        isDomainVerified: true,
        isEmailVerified: true,
        verificationStatus: true,
        domainVerificationMethod: true,
        website: true,
        rejectionReason: true,
      },
    });

    if (!developer) {
      return next(createAppError('Developer not found', 404));
    }

    res.status(200).json({
      success: true,
      data: developer,
    });
  } catch (error) {
    logger.error('Error getting verification status:', error);
    next(error);
  }
};

// Resend email verification
export const resendEmailVerification = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const developerId = req.developer?.id;

    if (!developerId) {
      return next(createAppError('Developer not authenticated', 401));
    }

    const developer = await prisma.developer.findUnique({
      where: { id: developerId },
    });

    if (!developer) {
      return next(createAppError('Developer not found', 404));
    }

    if (developer.isEmailVerified) {
      return res.status(400).json({
        success: false,
        error: 'Email is already verified',
      });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    await prisma.developer.update({
      where: { id: developerId },
      data: { emailVerificationToken: verificationToken },
    });

    // Send verification email
    await sendEmailVerification(developer.email, verificationToken);

    res.status(200).json({
      success: true,
      message: 'Verification email sent successfully',
    });
  } catch (error) {
    logger.error('Error resending email verification:', error);
    next(error);
  }
};

// Verify email token
export const verifyEmailToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.params;

    const developer = await prisma.developer.findFirst({
      where: { emailVerificationToken: token },
    });

    if (!developer) {
      return next(createAppError('Invalid or expired verification token', 400));
    }

    await prisma.developer.update({
      where: { id: developer.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    logger.error('Error verifying email token:', error);
    next(error);
  }
};

// Admin: Approve developer
export const approveDeveloper = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { developerId } = req.params;

    const developer = await prisma.developer.update({
      where: { id: developerId },
      data: {
        verificationStatus: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: 'admin', // TODO: Get from authenticated admin
      },
    });

    // Send approval email
    await sendApprovalEmail(developer.email, developer.companyName);

    res.status(200).json({
      success: true,
      message: 'Developer approved successfully',
    });
  } catch (error) {
    logger.error('Error approving developer:', error);
    next(error);
  }
};

// Admin: Reject developer
export const rejectDeveloper = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { developerId } = req.params;
    const { reason } = req.body;

    const developer = await prisma.developer.update({
      where: { id: developerId },
      data: {
        verificationStatus: 'REJECTED',
        rejectionReason: reason,
      },
    });

    // Send rejection email
    await sendRejectionEmail(developer.email, developer.companyName, reason);

    res.status(200).json({
      success: true,
      message: 'Developer rejected successfully',
    });
  } catch (error) {
    logger.error('Error rejecting developer:', error);
    next(error);
  }
};

// Get pending applications
export const getPendingApplications = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const pendingDevelopers = await prisma.developer.findMany({
      where: {
        verificationStatus: 'PENDING',
        isEmailVerified: true,
        isDomainVerified: true,
      },
      select: {
        id: true,
        email: true,
        companyName: true,
        website: true,
        businessEmail: true,
        address: true,
        phoneNumber: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: pendingDevelopers,
    });
  } catch (error) {
    logger.error('Error getting pending applications:', error);
    next(error);
  }
};

// Helper functions
async function verifyDNSRecord(website: string, token: string): Promise<boolean> {
  return new Promise((resolve) => {
    const domain = new URL(website).hostname;
    const recordName = `_rapidtech-verification.${domain}`;

    dns.resolveTxt(recordName, (err, records) => {
      if (err) {
        logger.error('DNS verification error:', err);
        resolve(false);
        return;
      }

      const found = records.some(record => 
        record.some(txt => txt.includes(token))
      );
      resolve(found);
    });
  });
}

async function verifyMetaTag(website: string, token: string): Promise<boolean> {
  try {
    const response = await axios.get(website, {
      timeout: 10000,
      headers: {
        'User-Agent': 'RapidTech-Verification-Bot/1.0',
      },
    });

    const $ = cheerio.load(response.data);
    const metaTag = $('meta[name="rapidtech-site-verification"]').attr('content');
    
    return metaTag === token;
  } catch (error) {
    logger.error('Meta tag verification error:', error);
    return false;
  }
}

async function notifyAdminForReview(developer: any) {
  // TODO: Implement admin notification
  logger.info(`Developer ${developer.companyName} ready for review`);
}

async function sendEmailVerification(email: string, token: string) {
  const verificationUrl = `${process.env.API_BASE_URL}/api/verification/email/verify/${token}`;
  
  await sendEmail({
    to: email,
    subject: 'Verify your email - Rapid Tech Store',
    html: `
      <h2>Welcome to Rapid Tech Store!</h2>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verificationUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
      <p>If you didn't create this account, please ignore this email.</p>
    `,
  });
}

async function sendApprovalEmail(email: string, companyName: string) {
  await sendEmail({
    to: email,
    subject: 'Application Approved - Rapid Tech Store',
    html: `
      <h2>Congratulations ${companyName}!</h2>
      <p>Your application has been approved. You are now a Rapid Tech Partner!</p>
      <p>You can now start converting your web applications to mobile experiences.</p>
      <a href="${process.env.CONSOLE_URL}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Access Developer Console</a>
    `,
  });
}

async function sendRejectionEmail(email: string, companyName: string, reason: string) {
  await sendEmail({
    to: email,
    subject: 'Application Update - Rapid Tech Store',
    html: `
      <h2>Application Update for ${companyName}</h2>
      <p>Unfortunately, your application was not approved at this time.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>You can reapply after addressing the mentioned concerns.</p>
    `,
  });
}

// ===== NEW COMPREHENSIVE VERIFICATION METHODS =====

/**
 * Initiate comprehensive domain verification
 * POST /api/verification/v2/initiate
 */
export const initiateComprehensiveVerification = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { domain, verificationType, appId } = req.body;
    const developerId = req.developer?.id;

    if (!developerId) {
      return next(createAppError('Developer not authenticated', 401));
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return next(createAppError('Invalid domain format', 400));
    }

    // Validate verification type
    const validTypes = ['DNS_TXT', 'META_TAG', 'FILE_UPLOAD', 'MANUAL_REVIEW'];
    if (!validTypes.includes(verificationType)) {
      return next(createAppError('Invalid verification type', 400));
    }

    const verificationRequest: VerificationRequest = {
      developerId,
      domain,
      verificationType,
      appId
    };

    const result = await ownerVerificationService.initiateVerification(verificationRequest);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          verificationId: result.verificationId,
          token: result.token,
          expiresAt: result.expiresAt,
          instructions: result.instructions
        }
      });
    } else {
      return next(createAppError(result.message, 400));
    }

  } catch (error) {
    logger.error('Error in initiateComprehensiveVerification:', error);
    return next(createAppError('Internal server error', 500));
  }
};

/**
 * Verify domain ownership using comprehensive verification
 * POST /api/verification/v2/verify
 */
export const verifyComprehensiveOwnership = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { verificationId } = req.body;
    const developerId = req.developer?.id;

    if (!developerId) {
      return next(createAppError('Developer not authenticated', 401));
    }

    if (!verificationId) {
      return next(createAppError('Verification ID is required', 400));
    }

    const result = await ownerVerificationService.verifyOwnership(verificationId);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          verificationId: result.verificationId,
          verified: true
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        data: {
          verificationId: result.verificationId,
          verified: false
        }
      });
    }

  } catch (error) {
    logger.error('Error in verifyComprehensiveOwnership:', error);
    return next(createAppError('Internal server error', 500));
  }
};

/**
 * Get comprehensive verification status
 * GET /api/verification/v2/:verificationId
 */
export const getComprehensiveVerificationStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { verificationId } = req.params;
    const developerId = req.developer?.id;

    if (!developerId) {
      return next(createAppError('Developer not authenticated', 401));
    }

    if (!verificationId) {
      return next(createAppError('Verification ID is required', 400));
    }

    const verification = await ownerVerificationService.getVerificationStatus(verificationId);

    if (!verification) {
      return next(createAppError('Verification not found', 404));
    }

    // Check if verification belongs to the authenticated developer
    if (verification.developerId !== developerId) {
      return next(createAppError('Access denied', 403));
    }

    res.status(200).json({
      success: true,
      data: {
        id: verification.id,
        domain: verification.domain,
        verificationType: verification.verificationType,
        status: verification.status,
        verifiedAt: verification.verifiedAt,
        expiresAt: verification.expiresAt,
        failureReason: verification.failureReason,
        retryCount: verification.retryCount,
        maxRetries: verification.maxRetries,
        app: verification.app,
        createdAt: verification.createdAt,
        updatedAt: verification.updatedAt
      }
    });

  } catch (error) {
    logger.error('Error in getComprehensiveVerificationStatus:', error);
    return next(createAppError('Internal server error', 500));
  }
};

/**
 * List all verifications for a developer
 * GET /api/verification/v2/list
 */
export const listComprehensiveVerifications = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const developerId = req.developer?.id;

    if (!developerId) {
      return next(createAppError('Developer not authenticated', 401));
    }

    const verifications = await ownerVerificationService.listVerifications(developerId);

    res.status(200).json({
      success: true,
      data: verifications.map(v => ({
        id: v.id,
        domain: v.domain,
        verificationType: v.verificationType,
        status: v.status,
        verifiedAt: v.verifiedAt,
        expiresAt: v.expiresAt,
        failureReason: v.failureReason,
        retryCount: v.retryCount,
        maxRetries: v.maxRetries,
        app: v.app,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt
      }))
    });

  } catch (error) {
    logger.error('Error in listComprehensiveVerifications:', error);
    return next(createAppError('Internal server error', 500));
  }
};

/**
 * Delete a verification
 * DELETE /api/verification/v2/:verificationId
 */
export const deleteComprehensiveVerification = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { verificationId } = req.params;
    const developerId = req.developer?.id;

    if (!developerId) {
      return next(createAppError('Developer not authenticated', 401));
    }

    if (!verificationId) {
      return next(createAppError('Verification ID is required', 400));
    }

    const success = await ownerVerificationService.deleteVerification(verificationId, developerId);

    if (success) {
      res.status(200).json({
        success: true,
        message: 'Verification deleted successfully'
      });
    } else {
      return next(createAppError('Verification not found or access denied', 404));
    }

  } catch (error) {
    logger.error('Error in deleteComprehensiveVerification:', error);
    return next(createAppError('Internal server error', 500));
  }
};