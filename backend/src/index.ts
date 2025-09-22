/**
 * RAPID TECH STORE - MAIN SERVER
 * 
 * Copyright (c) 2024 RAPID TECH - SHANKAR ELAVARASAN <shankarelavarasan90@gmail.com>
 * ALL RIGHTS RESERVED - PROPRIETARY SOFTWARE
 * 
 * This file is part of the Rapid Tech Store platform.
 * Unauthorized copying, modification, distribution, or use is strictly prohibited.
 * 
 * For licensing inquiries: shankarelavarasan90@gmail.com
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import developerRoutes from './routes/developers';
import appRoutes from './routes/apps';
import subscriptionRoutes from './routes/subscriptions';
import paymentRoutes from './routes/payments';
import analyticsRoutes from './routes/analytics';
import adminRoutes from './routes/admin';
import verificationRoutes from './routes/verification';
import conversionRoutes from './routes/conversion';
import webhookRoutes from './routes/webhooks';
import currencyRoutes from './routes/currency';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database and Redis
export const prisma = new PrismaClient();

// Initialize Redis with error handling for development
let redis: Redis | null = null;
try {
  if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL);
    redis.on('error', (err) => {
      logger.warn('Redis connection error:', err.message);
      redis = null;
    });
  } else {
    logger.info('Redis URL not provided, running without Redis cache');
  }
} catch (error) {
  logger.warn('Failed to initialize Redis:', error);
  redis = null;
}

export { redis };

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3001',
    process.env.CONSOLE_URL || 'http://localhost:3002',
    'https://rapidtech.store',
    'https://console.rapidtech.store',
  ],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
}));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Check Redis connection if available
    let redisStatus = 'not_configured';
    if (redis) {
      try {
        await redis.ping();
        redisStatus = 'connected';
      } catch (redisError) {
        redisStatus = 'disconnected';
        logger.warn('Redis ping failed:', redisError);
      }
    }
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: 'connected',
        redis: redisStatus
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Service dependencies unavailable',
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/developers', developerRoutes);
app.use('/api/apps', appRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/conversion', conversionRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/currency', currencyRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  // Close database connections
  await prisma.$disconnect();
  
  // Close Redis connection if available
  if (redis) {
    redis.disconnect();
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  // Close database connections
  await prisma.$disconnect();
  
  // Close Redis connection if available
  if (redis) {
    redis.disconnect();
  }
  
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Rapid Tech Store API server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;