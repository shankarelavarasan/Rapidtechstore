import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createAppError } from '../middleware/errorHandler';
import { sendEmail, emailTemplates } from '../services/emailService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Generate JWT token for user
 */
const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET || 'fallback-secret-key';
  return jwt.sign(
    { userId, type: 'user' },
    secret
  );
};

/**
 * Register new user
 */
export const registerUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, dateOfBirth, country } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw createAppError('User with this email already exists', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        country,
        isEmailVerified: false,
      },
    });

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      },
    });

    // Send verification email
    try {
      await sendEmail({
        to: email,
        subject: 'Welcome to Rapid Tech Store - Verify Your Email',
        html: `<p>Welcome ${name}! Please verify your email with token: ${verificationToken}</p>`
      });
    } catch (emailError) {
      logger.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails
    }

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email to verify your account.',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.isEmailVerified,
          country: user.country,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 */
export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw createAppError('Invalid email or password', 401);
    }

    if (!user.password) {
      throw createAppError('Invalid email or password', 401);
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw createAppError('Invalid email or password', 401);
    }

    // Check if user is suspended
    if (user.status === 'SUSPENDED') {
      throw createAppError('Your account has been suspended. Please contact support.', 403);
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate token
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.isEmailVerified,
          country: user.country,
          preferences: user.preferences,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user profile
 */
export const getUserProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        isEmailVerified: true,
        dateOfBirth: true,
        country: true,
        preferences: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            subscriptions: true,
            downloads: true,
            favorites: true,
            reviews: true,
          },
        },
      },
    });

    if (!user) {
      throw createAppError('User not found', 404);
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { name, dateOfBirth, country, preferences } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);
    if (country) updateData.country = country;
    if (preferences) updateData.preferences = preferences;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        isEmailVerified: true,
        dateOfBirth: true,
        country: true,
        preferences: true,
      },
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change password
 */
export const changePassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw createAppError('User not found', 404);
    }

    if (!user.password) {
      throw createAppError('User has no password set', 400);
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw createAppError('Current password is incorrect', 400);
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Forgot password
 */
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    // Send reset email
    try {
      await sendEmail({
        to: email,
        subject: 'Password Reset - Rapid Tech Store',
        html: `<p>Hello ${user.name}! Use this token to reset your password: ${resetToken}</p>`
      });
    } catch (emailError) {
      logger.error('Failed to send password reset email:', emailError);
      throw createAppError('Failed to send password reset email', 500);
    }

    res.json({
      success: true,
      message: 'Password reset link has been sent to your email.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password
 */
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw createAppError('Invalid or expired reset token', 400);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
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

/**
 * Get user subscriptions
 */
export const getUserSubscriptions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { page = 1, limit = 20, status } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const [subscriptions, totalCount] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          app: {
            select: {
              id: true,
              name: true,
              icon: true,
              category: true,
              developer: {
                select: {
                  companyName: true,
                },
              },
            },
          },
        },
      }),
      prisma.subscription.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / take);

    res.json({
      success: true,
      data: {
        subscriptions,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalCount,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Subscribe to app
 */
export const subscribeToApp = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { appId } = req.params;
    const { purchaseToken, productId, orderId } = req.body;

    // Check if app exists
    const app = await prisma.app.findUnique({
      where: { id: appId },
    });

    if (!app || app.status !== 'PUBLISHED') {
      throw createAppError('App not found or not available', 404);
    }

    // Check if user already has active subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        appId,
        status: 'ACTIVE',
      },
    });

    if (existingSubscription) {
      throw createAppError('You already have an active subscription to this app', 400);
    }

    // TODO: Verify purchase token with Google Play Billing API
    // For now, we'll create the subscription directly

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        appId,
        purchaseToken,
        productId,
        orderId,
        amount: 0, // TODO: Get actual amount from purchase data
        status: 'ACTIVE',
        startDate: new Date(),
        // endDate will be calculated based on subscription type
      },
    });

    // Update app subscription count
    await prisma.app.update({
      where: { id: appId },
      data: {
        subscriptionCount: {
          increment: 1,
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Unsubscribe from app
 */
export const unsubscribeFromApp = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { appId } = req.params;

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        appId,
        status: 'ACTIVE',
      },
    });

    if (!subscription) {
      throw createAppError('No active subscription found for this app', 404);
    }

    // Update subscription status
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'CANCELLED',
        endDate: new Date(),
      },
    });

    // Update app subscription count
    await prisma.app.update({
      where: { id: appId },
      data: {
        subscriptionCount: {
          decrement: 1,
        },
      },
    });

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user downloads
 */
export const getUserDownloads = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { page = 1, limit = 20 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [downloads, totalCount] = await Promise.all([
      prisma.download.findMany({
        where: { userId },
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          app: {
            select: {
              id: true,
              name: true,
              icon: true,
              category: true,
              developer: {
                select: {
                  companyName: true,
                },
              },
            },
          },
        },
      }),
      prisma.download.count({ where: { userId } }),
    ]);

    const totalPages = Math.ceil(totalCount / take);

    res.json({
      success: true,
      data: {
        downloads,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalCount,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Download app
 */
export const downloadApp = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { appId } = req.params;

    // Check if app exists
    const app = await prisma.app.findUnique({
      where: { id: appId },
    });

    if (!app || app.status !== 'PUBLISHED') {
      throw createAppError('App not found or not available', 404);
    }

    // Check if user already downloaded this app
    const existingDownload = await prisma.download.findFirst({
      where: {
        userId,
        appId,
      },
    });

    if (existingDownload) {
      res.json({
        success: true,
        message: 'App already downloaded',
        data: existingDownload,
      });
      return;
    }

    // Create download record
    const download = await prisma.download.create({
      data: {
        userId,
        appId,
      },
    });

    // Update app download count
    await prisma.app.update({
      where: { id: appId },
      data: {
        downloadCount: {
          increment: 1,
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'App downloaded successfully',
      data: download,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user favorites
 */
export const getUserFavorites = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { page = 1, limit = 20 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [favorites, totalCount] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId },
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          app: {
            select: {
              id: true,
              name: true,
              description: true,
              icon: true,
              category: true,
              rating: true,
              downloadCount: true,
              developer: {
                select: {
                  companyName: true,
                },
              },
            },
          },
        },
      }),
      prisma.favorite.count({ where: { userId } }),
    ]);

    const totalPages = Math.ceil(totalCount / take);

    res.json({
      success: true,
      data: {
        favorites,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalCount,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add app to favorites
 */
export const addToFavorites = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { appId } = req.params;

    // Check if app exists
    const app = await prisma.app.findUnique({
      where: { id: appId },
    });

    if (!app || app.status !== 'PUBLISHED') {
      throw createAppError('App not found or not available', 404);
    }

    // Check if already in favorites
    const existingFavorite = await prisma.favorite.findFirst({
      where: {
        userId,
        appId,
      },
    });

    if (existingFavorite) {
      res.json({
        success: true,
        message: 'App already in favorites',
        data: existingFavorite,
      });
      return;
    }

    // Add to favorites
    const favorite = await prisma.favorite.create({
      data: {
        userId,
        appId,
      },
    });

    res.status(201).json({
      success: true,
      message: 'App added to favorites',
      data: favorite,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove app from favorites
 */
export const removeFromFavorites = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { appId } = req.params;

    const favorite = await prisma.favorite.findFirst({
      where: {
        userId,
        appId,
      },
    });

    if (!favorite) {
      throw createAppError('App not found in favorites', 404);
    }

    await prisma.favorite.delete({
      where: { id: favorite.id },
    });

    res.json({
      success: true,
      message: 'App removed from favorites',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user reviews
 */
export const getUserReviews = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { page = 1, limit = 20, appId } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = { userId };
    if (appId) {
      where.appId = appId;
    }

    const [reviews, totalCount] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          app: {
            select: {
              id: true,
              name: true,
              icon: true,
            },
          },
        },
      }),
      prisma.review.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / take);

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalCount,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create review
 */
export const createReview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { appId } = req.params;
    const { rating, comment } = req.body;

    // Check if app exists
    const app = await prisma.app.findUnique({
      where: { id: appId },
    });

    if (!app || app.status !== 'PUBLISHED') {
      throw createAppError('App not found or not available', 404);
    }

    // Check if user already reviewed this app
    const existingReview = await prisma.review.findFirst({
      where: {
        userId,
        appId,
      },
    });

    if (existingReview) {
      throw createAppError('You have already reviewed this app', 400);
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        userId,
        appId,
        rating,
        comment,
      },
    });

    // Update app average rating
    const avgRating = await prisma.review.aggregate({
      where: { appId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.app.update({
      where: { id: appId },
      data: {
        rating: avgRating._avg.rating || 0,
        reviewCount: avgRating._count.rating,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update review
 */
export const updateReview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    const review = await prisma.review.findFirst({
      where: {
        id: reviewId,
        userId,
      },
    });

    if (!review) {
      throw createAppError('Review not found', 404);
    }

    const updateData: any = {};
    if (rating !== undefined) updateData.rating = rating;
    if (comment !== undefined) updateData.comment = comment;

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: updateData,
    });

    // Update app average rating if rating changed
    if (rating !== undefined) {
      const avgRating = await prisma.review.aggregate({
        where: { appId: review.appId },
        _avg: { rating: true },
      });

      await prisma.app.update({
        where: { id: review.appId },
        data: {
          rating: avgRating._avg.rating || 0,
        },
      });
    }

    res.json({
      success: true,
      message: 'Review updated successfully',
      data: updatedReview,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete review
 */
export const deleteReview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { reviewId } = req.params;

    const review = await prisma.review.findFirst({
      where: {
        id: reviewId,
        userId,
      },
    });

    if (!review) {
      throw createAppError('Review not found', 404);
    }

    await prisma.review.delete({
      where: { id: reviewId },
    });

    // Update app average rating and count
    const avgRating = await prisma.review.aggregate({
      where: { appId: review.appId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.app.update({
      where: { id: review.appId },
      data: {
        rating: avgRating._avg.rating || 0,
        reviewCount: avgRating._count.rating,
      },
    });

    res.json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user analytics
 */
export const getUserAnalytics = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const [
      totalDownloads,
      totalSubscriptions,
      totalReviews,
      totalFavorites,
      recentActivity,
    ] = await Promise.all([
      prisma.download.count({ where: { userId } }),
      prisma.subscription.count({ where: { userId } }),
      prisma.review.count({ where: { userId } }),
      prisma.favorite.count({ where: { userId } }),
      prisma.download.findMany({
        where: { userId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          app: {
            select: {
              name: true,
              icon: true,
            },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalDownloads,
        totalSubscriptions,
        totalReviews,
        totalFavorites,
        recentActivity,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user account
 */
export const deleteUserAccount = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { password } = req.body;

    // Verify password
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw createAppError('User not found', 404);
    }

    if (!user.password) {
      throw createAppError('User has no password set', 400);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw createAppError('Invalid password', 400);
    }

    // Delete user and all related data
    await prisma.user.delete({
      where: { id: userId },
    });

    logger.info(`User account deleted: ${userId}`);

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};