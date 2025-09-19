import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { randomBytes } from 'crypto';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Generate unique database name for this test run
const testDatabaseName = `rapidtechstore_test_${randomBytes(8).toString('hex')}`;
const testDatabaseUrl = process.env.DATABASE_URL?.replace(
  /\/[^/]+$/,
  `/${testDatabaseName}`
);

// Set the test database URL
process.env.DATABASE_URL = testDatabaseUrl;

let prisma: PrismaClient;

beforeAll(async () => {
  // Create test database
  try {
    execSync(`createdb ${testDatabaseName}`, { stdio: 'ignore' });
  } catch (error) {
    // Database might already exist, ignore error
  }

  // Initialize Prisma client
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: testDatabaseUrl,
      },
    },
  });

  // Run migrations
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: 'ignore',
  });

  // Connect to database
  await prisma.$connect();
});

afterAll(async () => {
  // Disconnect from database
  await prisma.$disconnect();

  // Drop test database
  try {
    execSync(`dropdb ${testDatabaseName}`, { stdio: 'ignore' });
  } catch (error) {
    // Ignore errors when dropping database
  }
});

beforeEach(async () => {
  // Clean up database before each test
  await cleanupDatabase();
});

async function cleanupDatabase() {
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ');

  try {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
  } catch (error) {
    console.log({ error });
  }
}

// Export prisma instance for tests
export { prisma };

// Mock external services
jest.mock('../src/services/openaiService', () => ({
  generateRecommendations: jest.fn().mockResolvedValue([]),
  analyzeAppContent: jest.fn().mockResolvedValue({
    category: 'productivity',
    tags: ['test'],
    description: 'Test app',
  }),
}));

jest.mock('../src/services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  sendAppApprovalEmail: jest.fn().mockResolvedValue(true),
  sendPayoutNotificationEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/services/storageService', () => ({
  uploadFile: jest.fn().mockResolvedValue('https://example.com/test-file.jpg'),
  deleteFile: jest.fn().mockResolvedValue(true),
  generateSignedUrl: jest.fn().mockResolvedValue('https://example.com/signed-url'),
}));

jest.mock('../src/services/paymentService', () => ({
  createPaymentIntent: jest.fn().mockResolvedValue({
    id: 'pi_test_123',
    client_secret: 'pi_test_123_secret',
  }),
  confirmPayment: jest.fn().mockResolvedValue({
    id: 'pi_test_123',
    status: 'succeeded',
  }),
  refundPayment: jest.fn().mockResolvedValue({
    id: 'rf_test_123',
    status: 'succeeded',
  }),
}));

jest.mock('../src/services/payoutService', () => ({
  calculateEarnings: jest.fn().mockResolvedValue({
    totalEarnings: 1000,
    availableForPayout: 800,
    pendingPayouts: 200,
  }),
  requestPayout: jest.fn().mockResolvedValue({
    id: 'payout_test_123',
    status: 'pending',
    amount: 800,
  }),
  processAutomaticPayouts: jest.fn().mockResolvedValue([]),
}));

// Global test utilities
global.testUtils = {
  createTestUser: async (overrides = {}) => {
    return prisma.user.create({
      data: {
        email: `test-${randomBytes(4).toString('hex')}@example.com`,
        name: 'Test User',
        role: 'USER',
        isEmailVerified: true,
        ...overrides,
      },
    });
  },

  createTestDeveloper: async (overrides = {}) => {
    return prisma.user.create({
      data: {
        email: `dev-${randomBytes(4).toString('hex')}@example.com`,
        name: 'Test Developer',
        role: 'DEVELOPER',
        isEmailVerified: true,
        ...overrides,
      },
    });
  },

  createTestAdmin: async (overrides = {}) => {
    return prisma.user.create({
      data: {
        email: `admin-${randomBytes(4).toString('hex')}@example.com`,
        name: 'Test Admin',
        role: 'ADMIN',
        isEmailVerified: true,
        ...overrides,
      },
    });
  },

  createTestApp: async (developerId: string, overrides = {}) => {
    return prisma.app.create({
      data: {
        name: `Test App ${randomBytes(4).toString('hex')}`,
        description: 'A test application',
        category: 'PRODUCTIVITY',
        platform: 'ANDROID',
        version: '1.0.0',
        packageName: `com.test.app${randomBytes(4).toString('hex')}`,
        downloadUrl: 'https://example.com/app.apk',
        iconUrl: 'https://example.com/icon.png',
        screenshots: ['https://example.com/screenshot1.png'],
        price: 0,
        status: 'APPROVED',
        developerId,
        ...overrides,
      },
    });
  },

  createTestCategory: async (overrides = {}) => {
    return prisma.category.create({
      data: {
        name: `Test Category ${randomBytes(4).toString('hex')}`,
        description: 'A test category',
        iconUrl: 'https://example.com/category-icon.png',
        ...overrides,
      },
    });
  },

  createTestReview: async (userId: string, appId: string, overrides = {}) => {
    return prisma.review.create({
      data: {
        rating: 5,
        comment: 'Great app!',
        userId,
        appId,
        ...overrides,
      },
    });
  },

  createTestPayout: async (developerId: string, overrides = {}) => {
    return prisma.payout.create({
      data: {
        amount: 1000,
        currency: 'USD',
        status: 'PENDING',
        method: 'RAZORPAY',
        developerId,
        ...overrides,
      },
    });
  },

  generateJWT: (userId: string, role = 'USER') => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { userId, role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  },

  makeAuthenticatedRequest: (token: string) => ({
    set: (header: string, value: string) => ({
      Authorization: `Bearer ${token}`,
      [header]: value,
    }),
    auth: `Bearer ${token}`,
  }),
};

// Extend Jest matchers
expect.extend({
  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },

  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },

  toBeValidDate(received) {
    const date = new Date(received);
    const pass = !isNaN(date.getTime());
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid date`,
        pass: false,
      };
    }
  },
});

// Type declarations for global utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidEmail(): R;
      toBeValidDate(): R;
    }
  }

  var testUtils: {
    createTestUser: (overrides?: any) => Promise<any>;
    createTestDeveloper: (overrides?: any) => Promise<any>;
    createTestAdmin: (overrides?: any) => Promise<any>;
    createTestApp: (developerId: string, overrides?: any) => Promise<any>;
    createTestCategory: (overrides?: any) => Promise<any>;
    createTestReview: (userId: string, appId: string, overrides?: any) => Promise<any>;
    createTestPayout: (developerId: string, overrides?: any) => Promise<any>;
    generateJWT: (userId: string, role?: string) => string;
    makeAuthenticatedRequest: (token: string) => any;
  };
}