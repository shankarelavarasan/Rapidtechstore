import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { aiConversionService } from '../services/aiConversionService';
import { createAppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
  developer?: {
    id: string;
    email: string;
    status: string;
  };
}

/**
 * Get all apps (public endpoint with filtering and pagination)
 */
export const getPublicApps = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      featured,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Build where clause
    const where: any = {
      status: 'PUBLISHED',
    };

    if (category) {
      where.category = category;
    }

    if (featured === 'true') {
      where.featured = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { tags: { hasSome: [search as string] } },
      ];
    }

    // Build orderBy clause
    const orderBy: any = {};
    if (sortBy === 'downloads') {
      orderBy.downloadCount = sortOrder;
    } else if (sortBy === 'rating') {
      orderBy.rating = sortOrder;
    } else if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const [apps, totalCount] = await Promise.all([
      prisma.app.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          developer: {
            select: {
              id: true,
              companyName: true,
              email: true,
            },
          },
          _count: {
            select: {
              reviews: true,
              subscriptions: true,
            },
          },
        },
      }),
      prisma.app.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / take);

    res.json({
      success: true,
      data: {
        apps,
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
 * Get app by ID (public endpoint)
 */
export const getPublicAppById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const app = await prisma.app.findUnique({
      where: { id },
      include: {
        developer: {
          select: {
            id: true,
            companyName: true,
            email: true,
          },
        },
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        _count: {
          select: {
            reviews: true,
            subscriptions: true,
          },
        },
      },
    });

    if (!app) {
      throw createAppError('App not found', 404);
    }

    if (app.status !== 'PUBLISHED') {
      throw createAppError('App not available', 404);
    }

    res.json({
      success: true,
      data: app,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get featured apps (public endpoint)
 */
export const getFeaturedApps = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit = 10 } = req.query;

    const apps = await prisma.app.findMany({
      where: {
        status: 'PUBLISHED',
        featured: true,
      },
      take: Number(limit),
      orderBy: {
        featuredAt: 'desc',
      },
      include: {
        developer: {
          select: {
            id: true,
            companyName: true,
          },
        },
        _count: {
          select: {
            reviews: true,
            subscriptions: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: apps,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get top charts (public endpoint)
 */
export const getTopCharts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type = 'downloads', limit = 10 } = req.query;

    let orderBy: any = {};
    
    switch (type) {
      case 'downloads':
        orderBy = { downloadCount: 'desc' };
        break;
      case 'rating':
        orderBy = { rating: 'desc' };
        break;
      case 'revenue':
        orderBy = { totalRevenue: 'desc' };
        break;
      default:
        orderBy = { downloadCount: 'desc' };
    }

    const apps = await prisma.app.findMany({
      where: {
        status: 'PUBLISHED',
      },
      take: Number(limit),
      orderBy,
      include: {
        developer: {
          select: {
            id: true,
            companyName: true,
          },
        },
        _count: {
          select: {
            reviews: true,
            subscriptions: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: apps,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get app categories (public endpoint)
 */
export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.app.groupBy({
      by: ['category'],
      where: {
        status: 'PUBLISHED',
      },
      _count: {
        category: true,
      },
      orderBy: {
        _count: {
          category: 'desc',
        },
      },
    });

    const formattedCategories = categories.map(cat => ({
      name: cat.category,
      count: cat._count.category,
    }));

    res.json({
      success: true,
      data: formattedCategories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create app (alias for createAppViaAI)
 */
export const createApp = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  return createAppViaAI(req, res, next);
};

/**
 * Create app via AI conversion
 */
export const createAppViaAI = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { websiteUrl, appName, appDescription } = req.body;
    const developerId = req.developer!.id;

    // Check if developer is verified
    if (req.developer!.status !== 'VERIFIED') {
      throw createAppError('Developer must be verified to create apps', 403);
    }

    // Check if app with this website URL already exists for this developer
    const existingApp = await prisma.app.findFirst({
      where: {
        developerId,
        websiteUrl,
      },
    });

    if (existingApp) {
      throw createAppError('App with this website URL already exists', 400);
    }

    // Start AI conversion process
    logger.info(`Starting AI conversion for developer ${developerId}, website: ${websiteUrl}`);
    
    const appId = await aiConversionService.convertWebsiteToApp(
      websiteUrl,
      developerId,
      appName,
      appDescription
    );

    const app = await prisma.app.findUnique({
      where: { id: appId },
      include: {
        developer: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'App created successfully via AI conversion',
      data: app,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get developer's apps (developer endpoint)
 */
export const getDeveloperApps = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const developerId = req.developer!.id;
    const { page = 1, limit = 20, status } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = { developerId };
    if (status) {
      where.status = status;
    }

    const [apps, totalCount] = await Promise.all([
      prisma.app.findMany({
        where,
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          _count: {
            select: {
              reviews: true,
              subscriptions: true,
            },
          },
        },
      }),
      prisma.app.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / take);

    res.json({
      success: true,
      data: {
        apps,
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
 * Get developer's app by ID (developer endpoint)
 */
export const getDeveloperAppById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const developerId = req.developer!.id;

    const app = await prisma.app.findFirst({
      where: {
        id,
        developerId,
      },
      include: {
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            reviews: true,
            subscriptions: true,
          },
        },
      },
    });

    if (!app) {
      throw createAppError('App not found', 404);
    }

    res.json({
      success: true,
      data: app,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update app (developer endpoint)
 */
export const updateApp = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const developerId = req.developer!.id;
    const updateData = req.body;

    // Check if app exists and belongs to developer
    const existingApp = await prisma.app.findFirst({
      where: {
        id,
        developerId,
      },
    });

    if (!existingApp) {
      throw createAppError('App not found', 404);
    }

    // Don't allow updating certain fields
    delete updateData.id;
    delete updateData.developerId;
    delete updateData.status;
    delete updateData.featured;
    delete updateData.downloadCount;
    delete updateData.rating;
    delete updateData.totalRevenue;

    const updatedApp = await prisma.app.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'App updated successfully',
      data: updatedApp,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit app for review (developer endpoint)
 */
export const submitAppForReview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const developerId = req.developer!.id;

    const app = await prisma.app.findFirst({
      where: {
        id,
        developerId,
      },
    });

    if (!app) {
      throw createAppError('App not found', 404);
    }

    if (app.status !== 'DRAFT') {
      throw createAppError('Only draft apps can be submitted for review', 400);
    }

    const updatedApp = await prisma.app.update({
      where: { id },
      data: {
        status: 'PENDING_REVIEW',
        submittedAt: new Date(),
      },
    });

    // Log the submission
    logger.info(`App ${id} submitted for review by developer ${developerId}`);

    res.json({
      success: true,
      message: 'App submitted for review successfully',
      data: updatedApp,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Regenerate app via AI (developer endpoint)
 */
export const regenerateApp = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const developerId = req.developer!.id;

    const app = await prisma.app.findFirst({
      where: {
        id,
        developerId,
      },
    });

    if (!app) {
      throw createAppError('App not found', 404);
    }

    if (app.status === 'PUBLISHED') {
      throw createAppError('Cannot regenerate published apps', 400);
    }

    // Regenerate the app
    await aiConversionService.regenerateApp(id);

    const updatedApp = await prisma.app.findUnique({
      where: { id },
    });

    res.json({
      success: true,
      message: 'App regenerated successfully',
      data: updatedApp,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get app preview URL (developer endpoint)
 */
export const getAppPreview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const developerId = req.developer!.id;

    const app = await prisma.app.findFirst({
      where: {
        id,
        developerId,
      },
    });

    if (!app) {
      throw createAppError('App not found', 404);
    }

    // Generate preview URL (this would be your staging environment)
    const previewUrl = `${process.env.PREVIEW_BASE_URL || 'https://preview.rapidtech.store'}/app/${id}`;

    res.json({
      success: true,
      data: {
        previewUrl,
        app: {
          id: app.id,
          name: app.name,
          description: app.description,
          icon: app.icon,
          splashScreen: app.splashScreen,
          status: app.status,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete app (developer endpoint)
 */
export const deleteApp = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const developerId = req.developer!.id;

    const app = await prisma.app.findFirst({
      where: {
        id,
        developerId,
      },
    });

    if (!app) {
      throw createAppError('App not found', 404);
    }

    if (app.status === 'PUBLISHED') {
      throw createAppError('Cannot delete published apps. Please contact support.', 400);
    }

    await prisma.app.delete({
      where: { id },
    });

    logger.info(`App ${id} deleted by developer ${developerId}`);

    res.json({
      success: true,
      message: 'App deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get app analytics (developer endpoint)
 */
export const getAppAnalytics = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const developerId = req.developer!.id;
    const { period = '30d' } = req.query;

    const app = await prisma.app.findFirst({
      where: {
        id,
        developerId,
      },
    });

    if (!app) {
      throw createAppError('App not found', 404);
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get analytics data
    const [downloads, subscriptions, revenue, reviews] = await Promise.all([
      prisma.download.count({
        where: {
          appId: id,
          createdAt: {
            gte: startDate,
          },
        },
      }),
      prisma.subscription.count({
        where: {
          appId: id,
          createdAt: {
            gte: startDate,
          },
        },
      }),
      prisma.transaction.aggregate({
        where: {
          appId: id,
          status: 'COMPLETED',
          createdAt: {
            gte: startDate,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.review.findMany({
        where: {
          appId: id,
          createdAt: {
            gte: startDate,
          },
        },
        select: {
          rating: true,
          createdAt: true,
        },
      }),
    ]);

    // Calculate average rating
    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

    res.json({
      success: true,
      data: {
        period,
        downloads,
        subscriptions,
        revenue: revenue._sum.amount || 0,
        reviews: reviews.length,
        averageRating: Math.round(averageRating * 10) / 10,
        app: {
          id: app.id,
          name: app.name,
          totalDownloads: app.downloadCount,
          totalRevenue: app.totalRevenue,
          overallRating: app.rating,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get app reviews (developer endpoint)
 */
export const getAppReviews = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const developerId = req.developer!.id;
    const { page = 1, limit = 20, rating } = req.query;

    const app = await prisma.app.findFirst({
      where: {
        id,
        developerId,
      },
    });

    if (!app) {
      throw createAppError('App not found', 404);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = { appId: id };
    if (rating) {
      where.rating = Number(rating);
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
          user: {
            select: {
              id: true,
              name: true,
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