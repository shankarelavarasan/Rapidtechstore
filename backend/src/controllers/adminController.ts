import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../middleware/auth';
import { createAppError } from '../middleware/errorHandler';
import { sendEmail } from '../services/emailService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  admin?: {
    id: string;
    email: string;
    role: string;
  };
}

// Admin login
export const loginAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    const admin = await prisma.admin.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    if (!admin || !admin.isActive) {
      return next(createAppError('Invalid credentials', 401));
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return next(createAppError('Invalid credentials', 401));
    }

    const token = generateToken({
      id: admin.id,
      email: admin.email,
      type: 'admin',
    });

    const { password: _, ...adminData } = admin;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        admin: adminData,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get dashboard stats
export const getDashboardStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const [
      totalDevelopers,
      pendingDevelopers,
      totalApps,
      pendingApps,
      totalUsers,
      totalRevenue,
      monthlyRevenue,
      totalDownloads,
    ] = await Promise.all([
      prisma.developer.count(),
      prisma.developer.count({ where: { verificationStatus: 'PENDING_REVIEW' } }),
      prisma.app.count(),
      prisma.app.count({ where: { status: 'PENDING_REVIEW' } }),
      prisma.user.count(),
      prisma.transaction.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { amount: true },
      }),
      prisma.download.count(),
    ]);

    // Get recent activities
    const recentDevelopers = await prisma.developer.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        companyName: true,
        verificationStatus: true,
        createdAt: true,
      },
    });

    const recentApps = await prisma.app.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        developer: {
          select: {
            firstName: true,
            lastName: true,
            companyName: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        stats: {
          totalDevelopers,
          pendingDevelopers,
          totalApps,
          pendingApps,
          totalUsers,
          totalRevenue: totalRevenue._sum.amount || 0,
          monthlyRevenue: monthlyRevenue._sum.amount || 0,
          totalDownloads,
        },
        recentDevelopers,
        recentApps,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get developers
export const getDevelopers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (status) {
      where.verificationStatus = status;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { companyName: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [developers, total] = await Promise.all([
      prisma.developer.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          companyName: true,
          website: true,
          country: true,
          verificationStatus: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: { apps: true },
          },
        },
      }),
      prisma.developer.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        developers,
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

// Get developer by ID
export const getDeveloperById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const developer = await prisma.developer.findUnique({
      where: { id },
      include: {
        apps: {
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
        },
        payouts: {
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
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

// Approve developer
export const approveDeveloper = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const developer = await prisma.developer.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        verificationStatus: true,
      },
    });

    if (!developer) {
      return next(createAppError('Developer not found', 404));
    }

    if (developer.verificationStatus === 'APPROVED') {
      return next(createAppError('Developer is already approved', 400));
    }

    await prisma.developer.update({
      where: { id },
      data: {
        verificationStatus: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: req.admin!.id,
        reviewNotes: notes,
      },
    });

    // Send approval email
    try {
      await sendEmail({
        to: developer.email,
        subject: 'Application Approved - Welcome to Rapid Tech Store',
        template: 'applicationApproved',
        data: {
          firstName: developer.firstName,
          consoleUrl: `${process.env.FRONTEND_URL}/console`,
        },
      });
    } catch (emailError) {
      logger.error('Failed to send approval email:', emailError);
    }

    res.json({
      success: true,
      message: 'Developer approved successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Reject developer
export const rejectDeveloper = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { reason, notes } = req.body;

    const developer = await prisma.developer.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        verificationStatus: true,
      },
    });

    if (!developer) {
      return next(createAppError('Developer not found', 404));
    }

    await prisma.developer.update({
      where: { id },
      data: {
        verificationStatus: 'REJECTED',
        rejectedAt: new Date(),
        rejectedBy: req.admin!.id,
        rejectionReason: reason,
        reviewNotes: notes,
      },
    });

    // Send rejection email
    try {
      await sendEmail({
        to: developer.email,
        subject: 'Application Update - Rapid Tech Store',
        template: 'applicationRejected',
        data: {
          firstName: developer.firstName,
          reason,
        },
      });
    } catch (emailError) {
      logger.error('Failed to send rejection email:', emailError);
    }

    res.json({
      success: true,
      message: 'Developer rejected successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Suspend developer
export const suspendDeveloper = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await prisma.developer.update({
      where: { id },
      data: {
        isActive: false,
        suspensionReason: reason,
        suspendedAt: new Date(),
        suspendedBy: req.admin!.id,
      },
    });

    res.json({
      success: true,
      message: 'Developer suspended successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Activate developer
export const activateDeveloper = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    await prisma.developer.update({
      where: { id },
      data: {
        isActive: true,
        suspensionReason: null,
        suspendedAt: null,
        suspendedBy: null,
      },
    });

    res.json({
      success: true,
      message: 'Developer activated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get apps
export const getApps = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = 1, limit = 10, status, category, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
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
        include: {
          developer: {
            select: {
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
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

// Get app by ID
export const getAppById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const app = await prisma.app.findUnique({
      where: { id },
      include: {
        developer: true,
        reviews: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            downloads: true,
            subscriptions: true,
            reviews: true,
          },
        },
      },
    });

    if (!app) {
      return next(createAppError('App not found', 404));
    }

    res.json({
      success: true,
      data: { app },
    });
  } catch (error) {
    next(error);
  }
};

// Approve app
export const approveApp = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    await prisma.app.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: req.admin!.id,
        reviewNotes: notes,
      },
    });

    res.json({
      success: true,
      message: 'App approved successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Reject app
export const rejectApp = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { reason, notes } = req.body;

    await prisma.app.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectedBy: req.admin!.id,
        rejectionReason: reason,
        reviewNotes: notes,
      },
    });

    res.json({
      success: true,
      message: 'App rejected successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Suspend app
export const suspendApp = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await prisma.app.update({
      where: { id },
      data: {
        status: 'SUSPENDED',
        suspensionReason: reason,
        suspendedAt: new Date(),
        suspendedBy: req.admin!.id,
      },
    });

    res.json({
      success: true,
      message: 'App suspended successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Feature app
export const featureApp = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { featured, featuredUntil } = req.body;

    await prisma.app.update({
      where: { id },
      data: {
        featured,
        featuredUntil: featuredUntil ? new Date(featuredUntil) : null,
      },
    });

    res.json({
      success: true,
      message: `App ${featured ? 'featured' : 'unfeatured'} successfully`,
    });
  } catch (error) {
    next(error);
  }
};

// Get users
export const getUsers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          isEmailVerified: true,
          createdAt: true,
          _count: {
            select: {
              subscriptions: true,
              downloads: true,
              reviews: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users,
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

// Get user by ID
export const getUserById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        subscriptions: {
          include: {
            app: {
              select: {
                name: true,
                developer: {
                  select: { companyName: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        downloads: {
          include: {
            app: {
              select: { name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            subscriptions: true,
            downloads: true,
            reviews: true,
          },
        },
      },
    });

    if (!user) {
      return next(createAppError('User not found', 404));
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

// Suspend user
export const suspendUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await prisma.user.update({
      where: { id },
      data: {
        suspensionReason: reason,
        suspendedAt: new Date(),
        suspendedBy: req.admin!.id,
      },
    });

    res.json({
      success: true,
      message: 'User suspended successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get analytics overview
export const getAnalyticsOverview = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalRevenue,
      monthlyRevenue,
      totalDownloads,
      monthlyDownloads,
      activeSubscriptions,
      topApps,
      revenueByCategory,
    ] = await Promise.all([
      prisma.transaction.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: { amount: true },
      }),
      prisma.download.count(),
      prisma.download.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.subscription.count({
        where: { status: 'ACTIVE' },
      }),
      prisma.app.findMany({
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
        take: 10,
      }),
      prisma.app.groupBy({
        by: ['category'],
        _sum: {
          price: true,
        },
        _count: {
          downloads: true,
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalRevenue: totalRevenue._sum.amount || 0,
          monthlyRevenue: monthlyRevenue._sum.amount || 0,
          totalDownloads,
          monthlyDownloads,
          activeSubscriptions,
        },
        topApps,
        revenueByCategory,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get revenue analytics
export const getRevenueAnalytics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { period = '30d', startDate, endDate } = req.query;

    let dateFilter: any = {};

    if (startDate && endDate) {
      dateFilter = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    } else {
      const today = new Date();
      const daysBack = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
      dateFilter = {
        gte: new Date(today.getTime() - daysBack * 24 * 60 * 60 * 1000),
      };
    }

    const revenueData = await prisma.transaction.groupBy({
      by: ['createdAt'],
      where: {
        status: 'COMPLETED',
        createdAt: dateFilter,
      },
      _sum: { amount: true },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      success: true,
      data: { revenueData },
    });
  } catch (error) {
    next(error);
  }
};

// Get app analytics
export const getAppAnalytics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { period = '30d', category } = req.query;

    const today = new Date();
    const daysBack = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    const dateFilter = {
      gte: new Date(today.getTime() - daysBack * 24 * 60 * 60 * 1000),
    };

    const where: any = { createdAt: dateFilter };
    if (category) {
      where.app = { category };
    }

    const [downloadData, subscriptionData] = await Promise.all([
      prisma.download.groupBy({
        by: ['createdAt'],
        where,
        _count: true,
        orderBy: { createdAt: 'asc' },
      }),
      prisma.subscription.groupBy({
        by: ['createdAt'],
        where,
        _count: true,
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    res.json({
      success: true,
      data: {
        downloadData,
        subscriptionData,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get payouts
export const getPayouts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = 1, limit = 10, status, developerId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (developerId) {
      where.developerId = developerId;
    }

    const [payouts, total] = await Promise.all([
      prisma.payout.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          developer: {
            select: {
              firstName: true,
              lastName: true,
              companyName: true,
              email: true,
            },
          },
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

// Process payouts
export const processPayouts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { month, year } = req.body;

    // This would trigger the payout processing service
    // For now, we'll just return a success message
    res.json({
      success: true,
      message: `Payout processing initiated for ${month}/${year}`,
    });
  } catch (error) {
    next(error);
  }
};

// Retry payout
export const retryPayout = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    await prisma.payout.update({
      where: { id },
      data: {
        status: 'PENDING',
        failureReason: null,
      },
    });

    res.json({
      success: true,
      message: 'Payout retry initiated',
    });
  } catch (error) {
    next(error);
  }
};

// Get system config
export const getSystemConfig = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const config = await prisma.systemConfig.findFirst();

    res.json({
      success: true,
      data: { config },
    });
  } catch (error) {
    next(error);
  }
};

// Update system config
export const updateSystemConfig = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const updates = req.body;

    const config = await prisma.systemConfig.upsert({
      where: { id: 'default' },
      update: updates,
      create: { id: 'default', ...updates },
    });

    res.json({
      success: true,
      message: 'System configuration updated',
      data: { config },
    });
  } catch (error) {
    next(error);
  }
};

// Generate revenue report
export const generateRevenueReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;

    const transactions = await prisma.transaction.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        },
      },
      include: {
        app: {
          select: {
            name: true,
            developer: {
              select: {
                companyName: true,
              },
            },
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (format === 'csv') {
      // Generate CSV format
      const csv = transactions.map(t => ({
        Date: t.createdAt.toISOString(),
        App: t.app.name,
        Developer: t.app.developer.companyName,
        User: `${t.user.firstName} ${t.user.lastName}`,
        Amount: t.amount,
        Commission: t.commissionAmount,
        'Developer Share': t.developerAmount,
      }));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=revenue-report.csv');
      
      // Simple CSV generation (in production, use a proper CSV library)
      const csvContent = [
        Object.keys(csv[0]).join(','),
        ...csv.map(row => Object.values(row).join(','))
      ].join('\n');

      return res.send(csvContent);
    }

    res.json({
      success: true,
      data: { transactions },
    });
  } catch (error) {
    next(error);
  }
};

// Generate developer report
export const generateDeveloperReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { format = 'json' } = req.query;

    const developers = await prisma.developer.findMany({
      include: {
        _count: {
          select: {
            apps: true,
          },
        },
        apps: {
          select: {
            _count: {
              select: {
                downloads: true,
                subscriptions: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (format === 'csv') {
      const csv = developers.map(d => ({
        Name: `${d.firstName} ${d.lastName}`,
        Email: d.email,
        Company: d.companyName,
        Country: d.country,
        Status: d.verificationStatus,
        'Apps Count': d._count.apps,
        'Total Downloads': d.apps.reduce((sum, app) => sum + app._count.downloads, 0),
        'Total Subscriptions': d.apps.reduce((sum, app) => sum + app._count.subscriptions, 0),
        'Joined Date': d.createdAt.toISOString(),
      }));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=developer-report.csv');
      
      const csvContent = [
        Object.keys(csv[0]).join(','),
        ...csv.map(row => Object.values(row).join(','))
      ].join('\n');

      return res.send(csvContent);
    }

    res.json({
      success: true,
      data: { developers },
    });
  } catch (error) {
    next(error);
  }
};

// Get admins
export const getAdmins = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: { admins },
    });
  } catch (error) {
    next(error);
  }
};

// Create admin
export const createAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    const existingAdmin = await prisma.admin.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      return next(createAppError('Admin with this email already exists', 400));
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const admin = await prisma.admin.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: { admin },
    });
  } catch (error) {
    next(error);
  }
};

// Update admin
export const updateAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const admin = await prisma.admin.update({
      where: { id },
      data: updates,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      message: 'Admin updated successfully',
      data: { admin },
    });
  } catch (error) {
    next(error);
  }
};

// Delete admin
export const deleteAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (id === req.admin!.id) {
      return next(createAppError('Cannot delete your own account', 400));
    }

    await prisma.admin.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Admin deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};