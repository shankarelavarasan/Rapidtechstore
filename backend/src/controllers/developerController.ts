import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../middleware/auth';
import { createAppError } from '../middleware/errorHandler';
import { sendEmail } from '../services/emailService';
import crypto from 'crypto';
import logger from '../utils/logger';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  developer?: {
    id: string;
    email: string;
  };
}

// Developer registration
export const registerDeveloper = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      companyName,
      companyWebsite,
      phoneNumber,
      country,
      address,
      gstNumber,
      taxId,
    } = req.body;

    // Check if developer already exists
    const existingDeveloper = await prisma.developer.findUnique({
      where: { email },
    });

    if (existingDeveloper) {
      return next(createAppError('Developer with this email already exists', 400));
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create developer
    const developer = await prisma.developer.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        companyName,
        companyWebsite,
        phoneNumber,
        country,
        address,
        gstNumber,
        taxId,
        emailVerificationToken,
        emailVerificationExpires,
        verificationStatus: 'PENDING_EMAIL',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        companyName: true,
        verificationStatus: true,
        createdAt: true,
      },
    });

    // Send verification email
    try {
      await sendEmail({
        to: email,
        subject: 'Welcome to Rapid Tech Store - Verify Your Email',
        template: 'developerWelcome',
        data: {
          firstName,
          verificationLink: `${process.env.FRONTEND_URL}/verify-email?token=${emailVerificationToken}`,
        },
      });
    } catch (emailError) {
      logger.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Developer registered successfully. Please check your email for verification.',
      data: { developer },
    });
  } catch (error) {
    next(error);
  }
};

// Verify email
export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.body;

    const developer = await prisma.developer.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date(),
        },
      },
    });

    if (!developer) {
      return next(createAppError('Invalid or expired verification token', 400));
    }

    // Update developer
    await prisma.developer.update({
      where: { id: developer.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        verificationStatus: 'PENDING_DOMAIN',
      },
    });

    res.json({
      success: true,
      message: 'Email verified successfully. You can now proceed with domain verification.',
    });
  } catch (error) {
    next(error);
  }
};

// Developer login
export const loginDeveloper = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    // Find developer
    const developer = await prisma.developer.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        companyName: true,
        isActive: true,
        isEmailVerified: true,
        verificationStatus: true,
      },
    });

    if (!developer) {
      return next(createAppError('Invalid email or password', 401));
    }

    if (!developer.isActive) {
      return next(createAppError('Account is deactivated', 401));
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, developer.password);
    if (!isPasswordValid) {
      return next(createAppError('Invalid email or password', 401));
    }

    // Generate token
    const token = generateToken({
      id: developer.id,
      email: developer.email,
      type: 'developer',
    });

    // Remove password from response
    const { password: _, ...developerData } = developer;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        developer: developerData,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get developer profile
export const getDeveloperProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const developer = await prisma.developer.findUnique({
      where: { id: req.developer!.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        companyName: true,
        companyWebsite: true,
        phoneNumber: true,
        country: true,
        address: true,
        gstNumber: true,
        taxId: true,
        isEmailVerified: true,
        verificationStatus: true,
        domainVerificationMethod: true,
        domainVerificationToken: true,
        bankDetails: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!developer) {
      return next(createAppError('Developer not found', 404));
    }

    res.json({
      success: true,
      data: { developer },
    });
  } catch (error) {
    next(error);
  }
};

// Update developer profile
export const updateDeveloperProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      firstName,
      lastName,
      companyName,
      companyWebsite,
      phoneNumber,
      country,
      address,
      gstNumber,
      taxId,
    } = req.body;

    const developer = await prisma.developer.update({
      where: { id: req.developer!.id },
      data: {
        firstName,
        lastName,
        companyName,
        companyWebsite,
        phoneNumber,
        country,
        address,
        gstNumber,
        taxId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        companyName: true,
        companyWebsite: true,
        phoneNumber: true,
        country: true,
        address: true,
        gstNumber: true,
        taxId: true,
        verificationStatus: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { developer },
    });
  } catch (error) {
    next(error);
  }
};

// Update bank details
export const updateBankDetails = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { bankDetails } = req.body;

    const developer = await prisma.developer.update({
      where: { id: req.developer!.id },
      data: { bankDetails },
      select: {
        id: true,
        bankDetails: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      message: 'Bank details updated successfully',
      data: { developer },
    });
  } catch (error) {
    next(error);
  }
};

// Get developer dashboard stats
export const getDeveloperDashboard = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const developerId = req.developer!.id;

    // Get apps count
    const appsCount = await prisma.app.count({
      where: { developerId },
    });

    // Get total downloads
    const totalDownloads = await prisma.download.count({
      where: {
        app: { developerId },
      },
    });

    // Get active subscriptions
    const activeSubscriptions = await prisma.subscription.count({
      where: {
        app: { developerId },
        status: 'ACTIVE',
      },
    });

    // Get total revenue (this month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyRevenue = await prisma.transaction.aggregate({
      where: {
        app: { developerId },
        status: 'COMPLETED',
        createdAt: { gte: startOfMonth },
      },
      _sum: { amount: true },
    });

    // Get recent apps
    const recentApps = await prisma.app.findMany({
      where: { developerId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            downloads: true,
            subscriptions: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        stats: {
          appsCount,
          totalDownloads,
          activeSubscriptions,
          monthlyRevenue: monthlyRevenue._sum.amount || 0,
        },
        recentApps,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get developer apps
export const getDeveloperApps = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      developerId: req.developer!.id,
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [apps, total] = await Promise.all([
      prisma.app.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          icon: true,
          status: true,
          price: true,
          category: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              downloads: true,
              subscriptions: true,
              reviews: true,
            },
          },
        },
      }),
      prisma.app.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        apps,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get developer analytics
export const getDeveloperAnalytics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { period = '30d', appId } = req.query;
    const developerId = req.developer!.id;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    const where: any = {
      app: { developerId },
      createdAt: { gte: startDate, lte: endDate },
    };

    if (appId) {
      where.appId = appId;
    }

    // Get downloads over time
    const downloads = await prisma.download.groupBy({
      by: ['createdAt'],
      where,
      _count: true,
      orderBy: { createdAt: 'asc' },
    });

    // Get revenue over time
    const revenue = await prisma.transaction.groupBy({
      by: ['createdAt'],
      where: {
        ...where,
        status: 'COMPLETED',
      },
      _sum: { amount: true },
      orderBy: { createdAt: 'asc' },
    });

    // Get top performing apps
    const topApps = await prisma.app.findMany({
      where: { developerId },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            downloads: true,
            subscriptions: true,
          },
        },
      },
      orderBy: {
        downloads: { _count: 'desc' },
      },
      take: 5,
    });

    res.json({
      success: true,
      data: {
        downloads,
        revenue,
        topApps,
        period,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get developer payouts
export const getDeveloperPayouts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      developerId: req.developer!.id,
    };

    if (status) {
      where.status = status;
    }

    const [payouts, total] = await Promise.all([
      prisma.payout.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amount: true,
          status: true,
          paymentMethod: true,
          transactionId: true,
          createdAt: true,
          processedAt: true,
          failureReason: true,
        },
      }),
      prisma.payout.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        payouts,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Request password reset
export const requestPasswordReset = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    const developer = await prisma.developer.findUnique({
      where: { email },
      select: { id: true, email: true, firstName: true },
    });

    if (!developer) {
      // Don't reveal if email exists
      return res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent.',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.developer.update({
      where: { id: developer.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetTokenExpires,
      },
    });

    // Send reset email
    try {
      await sendEmail({
        to: email,
        subject: 'Password Reset - Rapid Tech Store',
        template: 'passwordReset',
        data: {
          firstName: developer.firstName,
          resetLink: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
        },
      });
    } catch (emailError) {
      logger.error('Failed to send password reset email:', emailError);
    }

    res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

// Reset password
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, newPassword } = req.body;

    const developer = await prisma.developer.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!developer) {
      return next(createAppError('Invalid or expired reset token', 400));
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token
    await prisma.developer.update({
      where: { id: developer.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Change password
export const changePassword = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const developer = await prisma.developer.findUnique({
      where: { id: req.developer!.id },
      select: { password: true },
    });

    if (!developer) {
      return next(createAppError('Developer not found', 404));
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      developer.password
    );

    if (!isCurrentPasswordValid) {
      return next(createAppError('Current password is incorrect', 400));
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.developer.update({
      where: { id: req.developer!.id },
      data: { password: hashedPassword },
    });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};