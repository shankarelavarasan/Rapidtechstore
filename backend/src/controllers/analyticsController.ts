import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

// Small async wrapper to avoid repetitive try/catch in each route
const asyncHandler = 
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);

/**
 * GET /analytics/public/top-charts
 * Query params: category, timeframe, limit
 */
export const getPublicTopCharts = asyncHandler(async (req: Request, res: Response) => {
  const { category, timeframe = 'weekly', limit = 20 } = req.query as {
    category?: string;
    timeframe?: string;
    limit?: string;
  };

  const limitNum = Math.min(100, Number(limit) || 20);
  
  // Get top apps by download count
  const topApps = await prisma.app.findMany({
    where: {
      isPublished: true,
      status: 'PUBLISHED',
      ...(category && { category: category }),
    },
    orderBy: { downloadCount: 'desc' },
    take: limitNum,
    select: {
      id: true,
      name: true,
      downloadCount: true,
      rating: true,
      reviewCount: true,
      category: true,
      icon: true,
      price: true,
    },
  });

  res.json({
    success: true,
    data: topApps,
  });
});

/**
 * GET /analytics/public/trending
 * Query params: category, limit
 */
export const getPublicTrending = asyncHandler(async (req: Request, res: Response) => {
  const { category, limit = 10 } = req.query as {
    category?: string;
    limit?: string;
  };

  const limitNum = Math.min(50, Number(limit) || 10);
  
  // Get trending apps based on recent downloads
  const trending = await prisma.app.findMany({
    where: {
      isPublished: true,
      status: 'PUBLISHED',
      ...(category && { category: category }),
      publishedAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      },
    },
    orderBy: [
      { downloadCount: 'desc' },
      { rating: 'desc' },
    ],
    take: limitNum,
    select: {
      id: true,
      name: true,
      downloadCount: true,
      rating: true,
      category: true,
      icon: true,
      shortDescription: true,
    },
  });

  res.json({
    success: true,
    data: trending,
  });
});

/**
 * GET /analytics/public/platform-stats
 */
export const getPublicPlatformStats = asyncHandler(async (req: Request, res: Response) => {
  const [totalApps, totalDevelopers, totalDownloads] = await Promise.all([
    prisma.app.count({ where: { isPublished: true } }),
    prisma.developer.count({ where: { isActive: true } }),
    prisma.download.count(),
  ]);

  res.json({
    success: true,
    data: {
      totalApps,
      totalDevelopers,
      totalDownloads,
    },
  });
});

/**
 * GET /analytics/developer/dashboard
 * Developer dashboard analytics
 */
export const getDeveloperDashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const developerId = req.user?.id;
  if (!developerId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const [apps, totalDownloads, totalRevenue, activeSubscriptions] = await Promise.all([
    prisma.app.findMany({
      where: { developerId },
      select: {
        id: true,
        name: true,
        downloadCount: true,
        rating: true,
        status: true,
      },
    }),
    prisma.download.count({
      where: { app: { developerId } },
    }),
    prisma.transaction.aggregate({
      where: { 
        subscription: { app: { developerId } },
        status: 'COMPLETED',
      },
      _sum: { developerShare: true },
    }),
    prisma.subscription.count({
      where: { 
        app: { developerId },
        status: 'ACTIVE',
      },
    }),
  ]);

  res.json({
    success: true,
    data: {
      apps,
      totalApps: apps.length,
      totalDownloads,
      totalRevenue: totalRevenue._sum.developerShare || 0,
      activeSubscriptions,
    },
  });
});

/**
 * GET /analytics/app/:appId
 * App-specific analytics
 */
export const getAppAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { appId } = req.params;
  const developerId = req.user?.id;
  
  if (!developerId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  // Verify app belongs to developer
  const app = await prisma.app.findFirst({
    where: { id: appId, developerId },
  });

  if (!app) {
    return res.status(404).json({ success: false, message: 'App not found' });
  }

  const [downloads, subscriptions, revenue, reviews] = await Promise.all([
    prisma.download.count({ where: { appId } }),
    prisma.subscription.count({ where: { appId, status: 'ACTIVE' } }),
    prisma.transaction.aggregate({
      where: { 
        subscription: { appId },
        status: 'COMPLETED',
      },
      _sum: { developerShare: true },
    }),
    prisma.review.findMany({
      where: { appId },
      select: {
        rating: true,
        comment: true,
        createdAt: true,
        user: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  res.json({
    success: true,
    data: {
      app: {
        id: app.id,
        name: app.name,
        downloadCount: app.downloadCount,
        rating: app.rating,
      },
      downloads,
      activeSubscriptions: subscriptions,
      revenue: revenue._sum.developerShare || 0,
      recentReviews: reviews,
    },
  });
});

/**
 * GET /analytics/app/:appId/performance
 * App performance metrics
 */
export const getAppPerformance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { appId } = req.params;
  const developerId = req.user?.id;
  
  if (!developerId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  // Verify app belongs to developer
  const app = await prisma.app.findFirst({
    where: { id: appId, developerId },
  });

  if (!app) {
    return res.status(404).json({ success: false, message: 'App not found' });
  }

  const analytics = await prisma.appAnalytics.findMany({
    where: { appId },
    orderBy: { date: 'desc' },
    take: 30, // Last 30 days
  });

  res.json({
    success: true,
    data: analytics,
  });
});

/**
 * GET /analytics/developer/revenue
 * Developer revenue analytics
 */
export const getDeveloperRevenue = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const developerId = req.user?.id;
  if (!developerId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const revenue = await prisma.transaction.groupBy({
    by: ['createdAt'],
    where: {
      subscription: { app: { developerId } },
      status: 'COMPLETED',
    },
    _sum: { developerShare: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    success: true,
    data: revenue,
  });
});

/**
 * GET /analytics/developer/audience
 * Developer audience analytics
 */
export const getDeveloperAudience = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const developerId = req.user?.id;
  if (!developerId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const audience = await prisma.download.groupBy({
    by: ['createdAt'],
    where: { app: { developerId } },
    _count: { id: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    success: true,
    data: audience,
  });
});

// Export all functions
export default {
  getPublicTopCharts,
  getPublicTrending,
  getPublicPlatformStats,
  getDeveloperDashboard,
  getAppAnalytics,
  getAppPerformance,
  getDeveloperRevenue,
  getDeveloperAudience,
};