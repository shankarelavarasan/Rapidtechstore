import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { createAppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

interface AnalyticsData {
  downloads: number;
  subscriptions: number;
  revenue: number;
  users: number;
  apps: number;
  developers: number;
}

interface AppAnalytics {
  appId: string;
  downloads: number;
  subscriptions: number;
  revenue: number;
  ratings: {
    average: number;
    count: number;
    distribution: { [key: number]: number };
  };
  reviews: number;
  conversionRate: number;
}

interface DeveloperAnalytics {
  developerId: string;
  totalRevenue: number;
  totalDownloads: number;
  totalSubscriptions: number;
  appCount: number;
  averageRating: number;
  monthlyRevenue: { month: string; revenue: number }[];
  topApps: { appId: string; name: string; revenue: number }[];
}

interface UserAnalytics {
  userId: string;
  totalSpent: number;
  subscriptionCount: number;
  downloadCount: number;
  favoriteCategories: string[];
  lastActivity: Date;
  engagementScore: number;
}

interface RevenueAnalytics {
  totalRevenue: number;
  subscriptionRevenue: number;
  oneTimeRevenue: number;
  platformFee: number;
  developerPayout: number;
  monthlyGrowth: number;
  revenueByCategory: { category: string; revenue: number }[];
  revenueByCountry: { country: string; revenue: number }[];
}

export class AnalyticsService {
  /**
   * Get platform-wide analytics dashboard data
   */
  async getPlatformAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<AnalyticsData> {
    try {
      const dateFilter = this.buildDateFilter(startDate, endDate);

      const [
        downloads,
        subscriptions,
        revenue,
        users,
        apps,
        developers,
      ] = await Promise.all([
        // Total downloads
        prisma.download.count({
          where: { createdAt: dateFilter },
        }),

        // Active subscriptions
        prisma.subscription.count({
          where: {
            status: 'ACTIVE',
            createdAt: dateFilter,
          },
        }),

        // Total revenue
        prisma.transaction.aggregate({
          where: {
            status: 'COMPLETED',
            createdAt: dateFilter,
          },
          _sum: { amount: true },
        }),

        // Total users
        prisma.user.count({
          where: { createdAt: dateFilter },
        }),

        // Total published apps
        prisma.app.count({
          where: {
            status: 'PUBLISHED',
            createdAt: dateFilter,
          },
        }),

        // Total verified developers
        prisma.developer.count({
          where: {
            status: 'VERIFIED',
            createdAt: dateFilter,
          },
        }),
      ]);

      return {
        downloads,
        subscriptions,
        revenue: revenue._sum.amount || 0,
        users,
        apps,
        developers,
      };
    } catch (error) {
      logger.error('Failed to get platform analytics:', error);
      throw createAppError('Failed to retrieve analytics data', 500);
    }
  }

  /**
   * Get detailed app analytics
   */
  async getAppAnalytics(
    appId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AppAnalytics> {
    try {
      const dateFilter = this.buildDateFilter(startDate, endDate);

      const [
        downloads,
        subscriptions,
        revenue,
        ratings,
        reviews,
        views,
      ] = await Promise.all([
        // Downloads count
        prisma.download.count({
          where: {
            appId,
            createdAt: dateFilter,
          },
        }),

        // Active subscriptions
        prisma.subscription.count({
          where: {
            appId,
            status: 'ACTIVE',
            createdAt: dateFilter,
          },
        }),

        // Revenue from this app
        prisma.transaction.aggregate({
          where: {
            appId,
            status: 'COMPLETED',
            createdAt: dateFilter,
          },
          _sum: { amount: true },
        }),

        // Ratings analytics
        prisma.review.aggregate({
          where: {
            appId,
            createdAt: dateFilter,
          },
          _avg: { rating: true },
          _count: { rating: true },
        }),

        // Reviews count
        prisma.review.count({
          where: {
            appId,
            comment: { not: null },
            createdAt: dateFilter,
          },
        }),

        // App views (if tracked)
        prisma.appView.count({
          where: {
            appId,
            createdAt: dateFilter,
          },
        }),
      ]);

      // Get rating distribution
      const ratingDistribution = await prisma.review.groupBy({
        by: ['rating'],
        where: {
          appId,
          createdAt: dateFilter,
        },
        _count: { rating: true },
      });

      const distribution: { [key: number]: number } = {};
      ratingDistribution.forEach((item) => {
        distribution[item.rating] = item._count.rating;
      });

      // Calculate conversion rate (downloads / views)
      const conversionRate = views > 0 ? (downloads / views) * 100 : 0;

      return {
        appId,
        downloads,
        subscriptions,
        revenue: revenue._sum.amount || 0,
        ratings: {
          average: ratings._avg.rating || 0,
          count: ratings._count.rating || 0,
          distribution,
        },
        reviews,
        conversionRate,
      };
    } catch (error) {
      logger.error('Failed to get app analytics:', error);
      throw createAppError('Failed to retrieve app analytics', 500);
    }
  }

  /**
   * Get developer analytics
   */
  async getDeveloperAnalytics(
    developerId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<DeveloperAnalytics> {
    try {
      const dateFilter = this.buildDateFilter(startDate, endDate);

      const [
        totalRevenue,
        totalDownloads,
        totalSubscriptions,
        appCount,
        averageRating,
        monthlyRevenue,
        topApps,
      ] = await Promise.all([
        // Total revenue
        prisma.transaction.aggregate({
          where: {
            app: { developerId },
            status: 'COMPLETED',
            createdAt: dateFilter,
          },
          _sum: { amount: true },
        }),

        // Total downloads
        prisma.download.count({
          where: {
            app: { developerId },
            createdAt: dateFilter,
          },
        }),

        // Total active subscriptions
        prisma.subscription.count({
          where: {
            app: { developerId },
            status: 'ACTIVE',
            createdAt: dateFilter,
          },
        }),

        // App count
        prisma.app.count({
          where: {
            developerId,
            status: 'PUBLISHED',
            createdAt: dateFilter,
          },
        }),

        // Average rating across all apps
        prisma.review.aggregate({
          where: {
            app: { developerId },
            createdAt: dateFilter,
          },
          _avg: { rating: true },
        }),

        // Monthly revenue for the last 12 months
        this.getMonthlyRevenue(developerId, 12),

        // Top revenue generating apps
        prisma.transaction.groupBy({
          by: ['appId'],
          where: {
            app: { developerId },
            status: 'COMPLETED',
            createdAt: dateFilter,
          },
          _sum: { amount: true },
          orderBy: { _sum: { amount: 'desc' } },
          take: 5,
        }),
      ]);

      // Get app details for top apps
      const topAppIds = topApps.map((app: any) => app.appId);
      const appDetails = await prisma.app.findMany({
        where: { id: { in: topAppIds } },
        select: { id: true, name: true },
      });

      const topAppsWithDetails = topApps.map((app: any) => {
        const details = appDetails.find((detail) => detail.id === app.appId);
        return {
          appId: app.appId,
          name: details?.name || 'Unknown',
          revenue: app._sum.amount || 0,
        };
      });

      return {
        developerId,
        totalRevenue: totalRevenue._sum.amount || 0,
        totalDownloads,
        totalSubscriptions,
        appCount,
        averageRating: averageRating._avg.rating || 0,
        monthlyRevenue,
        topApps: topAppsWithDetails,
      };
    } catch (error) {
      logger.error('Failed to get developer analytics:', error);
      throw createAppError('Failed to retrieve developer analytics', 500);
    }
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<UserAnalytics> {
    try {
      const dateFilter = this.buildDateFilter(startDate, endDate);

      const [
        totalSpent,
        subscriptionCount,
        downloadCount,
        favoriteCategories,
        lastActivity,
      ] = await Promise.all([
        // Total amount spent
        prisma.transaction.aggregate({
          where: {
            userId,
            status: 'COMPLETED',
            createdAt: dateFilter,
          },
          _sum: { amount: true },
        }),

        // Active subscriptions
        prisma.subscription.count({
          where: {
            userId,
            status: 'ACTIVE',
            createdAt: dateFilter,
          },
        }),

        // Total downloads
        prisma.download.count({
          where: {
            userId,
            createdAt: dateFilter,
          },
        }),

        // Favorite categories based on downloads
        prisma.download.groupBy({
          by: ['app'],
          where: {
            userId,
            createdAt: dateFilter,
          },
          _count: true,
          orderBy: { _count: { app: 'desc' } },
          take: 5,
        }),

        // Last activity
        prisma.download.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
      ]);

      // Get categories for favorite apps
      const appIds = favoriteCategories.map((item: any) => item.app);
      const apps = await prisma.app.findMany({
        where: { id: { in: appIds } },
        select: { id: true, category: true },
      });

      const categoryCount: { [key: string]: number } = {};
      apps.forEach((app) => {
        if (app.category) {
          categoryCount[app.category] = (categoryCount[app.category] || 0) + 1;
        }
      });

      const topCategories = Object.entries(categoryCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([category]) => category);

      // Calculate engagement score (simplified)
      const engagementScore = Math.min(
        100,
        (downloadCount * 10 + subscriptionCount * 20) / 10
      );

      return {
        userId,
        totalSpent: totalSpent._sum.amount || 0,
        subscriptionCount,
        downloadCount,
        favoriteCategories: topCategories,
        lastActivity: lastActivity?.createdAt || new Date(),
        engagementScore,
      };
    } catch (error) {
      logger.error('Failed to get user analytics:', error);
      throw createAppError('Failed to retrieve user analytics', 500);
    }
  }

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<RevenueAnalytics> {
    try {
      const dateFilter = this.buildDateFilter(startDate, endDate);

      const [
        totalRevenue,
        subscriptionRevenue,
        oneTimeRevenue,
        revenueByCategory,
        revenueByCountry,
        previousPeriodRevenue,
      ] = await Promise.all([
        // Total revenue
        prisma.transaction.aggregate({
          where: {
            status: 'COMPLETED',
            createdAt: dateFilter,
          },
          _sum: { amount: true },
        }),

        // Subscription revenue
        prisma.transaction.aggregate({
          where: {
            status: 'COMPLETED',
            type: 'SUBSCRIPTION',
            createdAt: dateFilter,
          },
          _sum: { amount: true },
        }),

        // One-time purchase revenue
        prisma.transaction.aggregate({
          where: {
            status: 'COMPLETED',
            type: 'ONE_TIME',
            createdAt: dateFilter,
          },
          _sum: { amount: true },
        }),

        // Revenue by category
        this.getRevenueByCategory(dateFilter),

        // Revenue by country
        this.getRevenueByCountry(dateFilter),

        // Previous period revenue for growth calculation
        this.getPreviousPeriodRevenue(startDate, endDate),
      ]);

      const totalRevenueAmount = totalRevenue._sum.amount || 0;
      const platformFee = totalRevenueAmount * 0.2; // 20% platform fee
      const developerPayout = totalRevenueAmount * 0.8; // 80% to developers

      // Calculate monthly growth
      const monthlyGrowth = previousPeriodRevenue > 0
        ? ((totalRevenueAmount - previousPeriodRevenue) / previousPeriodRevenue) * 100
        : 0;

      return {
        totalRevenue: totalRevenueAmount,
        subscriptionRevenue: subscriptionRevenue._sum.amount || 0,
        oneTimeRevenue: oneTimeRevenue._sum.amount || 0,
        platformFee,
        developerPayout,
        monthlyGrowth,
        revenueByCategory,
        revenueByCountry,
      };
    } catch (error) {
      logger.error('Failed to get revenue analytics:', error);
      throw createAppError('Failed to retrieve revenue analytics', 500);
    }
  }

  /**
   * Track app view
   */
  async trackAppView(appId: string, userId?: string, metadata?: any): Promise<void> {
    try {
      await prisma.appView.create({
        data: {
          appId,
          userId,
          metadata,
        },
      });
    } catch (error) {
      logger.error('Failed to track app view:', error);
      // Don't throw error for tracking failures
    }
  }

  /**
   * Track app download
   */
  async trackAppDownload(appId: string, userId: string, metadata?: any): Promise<void> {
    try {
      await prisma.download.create({
        data: {
          appId,
          userId,
          metadata,
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
    } catch (error) {
      logger.error('Failed to track app download:', error);
      throw createAppError('Failed to track download', 500);
    }
  }

  /**
   * Get top charts data
   */
  async getTopCharts(
    category?: string,
    type: 'free' | 'paid' | 'grossing' = 'free',
    limit: number = 10
  ): Promise<any[]> {
    try {
      let orderBy: any;
      let where: any = {
        status: 'PUBLISHED',
      };

      if (category) {
        where.category = category;
      }

      switch (type) {
        case 'free':
          where.price = 0;
          orderBy = { downloadCount: 'desc' };
          break;
        case 'paid':
          where.price = { gt: 0 };
          orderBy = { downloadCount: 'desc' };
          break;
        case 'grossing':
          orderBy = { revenue: 'desc' };
          break;
      }

      const apps = await prisma.app.findMany({
        where,
        orderBy,
        take: limit,
        include: {
          developer: {
            select: {
              companyName: true,
            },
          },
          _count: {
            select: {
              reviews: true,
            },
          },
        },
      });

      // Calculate average ratings
      const appsWithRatings = await Promise.all(
        apps.map(async (app) => {
          const avgRating = await prisma.review.aggregate({
            where: { appId: app.id },
            _avg: { rating: true },
          });

          return {
            ...app,
            averageRating: avgRating._avg.rating || 0,
            reviewCount: app._count.reviews,
          };
        })
      );

      return appsWithRatings;
    } catch (error) {
      logger.error('Failed to get top charts:', error);
      throw createAppError('Failed to retrieve top charts', 500);
    }
  }

  /**
   * Get trending apps
   */
  async getTrendingApps(limit: number = 10): Promise<any[]> {
    try {
      // Get apps with highest download growth in the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const trendingApps = await prisma.app.findMany({
        where: {
          status: 'PUBLISHED',
          downloads: {
            some: {
              createdAt: {
                gte: sevenDaysAgo,
              },
            },
          },
        },
        include: {
          developer: {
            select: {
              companyName: true,
            },
          },
          downloads: {
            where: {
              createdAt: {
                gte: sevenDaysAgo,
              },
            },
          },
          _count: {
            select: {
              reviews: true,
            },
          },
        },
        take: limit * 2, // Get more to filter and sort
      });

      // Sort by recent download count
      const sortedApps = trendingApps
        .map((app) => ({
          ...app,
          recentDownloads: app.downloads.length,
        }))
        .sort((a, b) => b.recentDownloads - a.recentDownloads)
        .slice(0, limit);

      // Add average ratings
      const appsWithRatings = await Promise.all(
        sortedApps.map(async (app) => {
          const avgRating = await prisma.review.aggregate({
            where: { appId: app.id },
            _avg: { rating: true },
          });

          return {
            ...app,
            averageRating: avgRating._avg.rating || 0,
            reviewCount: app._count.reviews,
          };
        })
      );

      return appsWithRatings;
    } catch (error) {
      logger.error('Failed to get trending apps:', error);
      throw createAppError('Failed to retrieve trending apps', 500);
    }
  }

  // Helper methods

  private buildDateFilter(startDate?: Date, endDate?: Date): any {
    if (!startDate && !endDate) return undefined;

    const filter: any = {};
    if (startDate) filter.gte = startDate;
    if (endDate) filter.lte = endDate;

    return filter;
  }

  private async getMonthlyRevenue(
    developerId: string,
    months: number
  ): Promise<{ month: string; revenue: number }[]> {
    const result = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const revenue = await prisma.transaction.aggregate({
        where: {
          app: { developerId },
          status: 'COMPLETED',
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        _sum: { amount: true },
      });

      result.unshift({
        month: monthStart.toISOString().slice(0, 7), // YYYY-MM format
        revenue: revenue._sum.amount || 0,
      });
    }

    return result;
  }

  private async getRevenueByCategory(dateFilter: any): Promise<{ category: string; revenue: number }[]> {
    const result = await prisma.transaction.groupBy({
      by: ['app'],
      where: {
        status: 'COMPLETED',
        createdAt: dateFilter,
      },
      _sum: { amount: true },
    });

    // Get app categories
    const appIds = result.map((item: any) => item.app);
    const apps = await prisma.app.findMany({
      where: { id: { in: appIds } },
      select: { id: true, category: true },
    });

    const categoryRevenue: { [key: string]: number } = {};
    result.forEach((item: any) => {
      const app = apps.find((a) => a.id === item.app);
      if (app && app.category) {
        categoryRevenue[app.category] = (categoryRevenue[app.category] || 0) + (item._sum.amount || 0);
      }
    });

    return Object.entries(categoryRevenue).map(([category, revenue]) => ({
      category,
      revenue,
    }));
  }

  private async getRevenueByCountry(dateFilter: any): Promise<{ country: string; revenue: number }[]> {
    // This would require storing user country information
    // For now, return empty array or mock data
    return [];
  }

  private async getPreviousPeriodRevenue(startDate?: Date, endDate?: Date): Promise<number> {
    if (!startDate || !endDate) return 0;

    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStart = new Date(startDate.getTime() - periodLength);
    const previousEnd = new Date(endDate.getTime() - periodLength);

    const revenue = await prisma.transaction.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: previousStart,
          lte: previousEnd,
        },
      },
      _sum: { amount: true },
    });

    return revenue._sum.amount || 0;
  }
}

export const analyticsService = new AnalyticsService();