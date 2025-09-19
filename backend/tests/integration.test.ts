import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../src/index';
import { createTestUser, createTestDeveloper, createTestApp, generateJWT } from './setup';

const prisma = new PrismaClient();

describe('Integration Tests - Complete Workflows', () => {
  let userToken: string;
  let developerToken: string;
  let adminToken: string;
  let testApp: any;
  let testUser: any;
  let testDeveloper: any;

  beforeAll(async () => {
    // Create test users
    testUser = await createTestUser();
    testDeveloper = await createTestDeveloper();
    
    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@rapidtechstore.com',
        password: 'hashedpassword',
        name: 'Admin User',
        role: 'ADMIN',
        isVerified: true,
      },
    });

    // Generate tokens
    userToken = generateJWT(testUser.id);
    developerToken = generateJWT(testDeveloper.id);
    adminToken = generateJWT(adminUser.id);

    // Create test app
    testApp = await createTestApp(testDeveloper.id);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Complete Developer Onboarding Flow', () => {
    it('should complete full developer verification process', async () => {
      // Step 1: Register as developer
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newdev@company.com',
          password: 'SecurePass123!',
          name: 'New Developer',
          role: 'DEVELOPER',
          companyName: 'Tech Company Inc',
          website: 'https://techcompany.com',
        });

      expect(registerResponse.status).toBe(201);
      const newDeveloper = registerResponse.body.user;

      // Step 2: Upload verification documents
      const verificationResponse = await request(app)
        .post('/api/developers/verify')
        .set('Authorization', `Bearer ${generateJWT(newDeveloper.id)}`)
        .send({
          businessRegistration: 'base64documentdata',
          governmentId: 'base64iddata',
          gstNumber: 'GST123456789',
        });

      expect(verificationResponse.status).toBe(200);

      // Step 3: Admin approves verification
      const approvalResponse = await request(app)
        .patch(`/api/admin/developers/${newDeveloper.id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'VERIFIED' });

      expect(approvalResponse.status).toBe(200);

      // Step 4: Developer can now publish apps
      const appResponse = await request(app)
        .post('/api/apps')
        .set('Authorization', `Bearer ${generateJWT(newDeveloper.id)}`)
        .send({
          name: 'Test App',
          description: 'A test application',
          category: 'PRODUCTIVITY',
          price: 9.99,
          downloadUrl: 'https://example.com/app.zip',
        });

      expect(appResponse.status).toBe(201);
    });
  });

  describe('Complete Purchase and Payout Flow', () => {
    it('should handle complete purchase to payout workflow', async () => {
      // Step 1: User purchases app
      const orderResponse = await request(app)
        .post('/api/payments/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          appId: testApp.id,
          paymentMethod: 'STRIPE',
        });

      expect(orderResponse.status).toBe(201);
      const order = orderResponse.body;

      // Step 2: Simulate payment verification
      const verifyResponse = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: order.id,
          paymentId: 'stripe_payment_123',
          signature: 'valid_signature',
        });

      expect(verifyResponse.status).toBe(200);

      // Step 3: Check purchase was created
      const purchaseResponse = await request(app)
        .get('/api/users/purchases')
        .set('Authorization', `Bearer ${userToken}`);

      expect(purchaseResponse.status).toBe(200);
      expect(purchaseResponse.body.purchases).toHaveLength(1);

      // Step 4: Check developer earnings
      const earningsResponse = await request(app)
        .get('/api/developers/earnings')
        .set('Authorization', `Bearer ${developerToken}`);

      expect(earningsResponse.status).toBe(200);
      expect(earningsResponse.body.totalEarnings).toBeGreaterThan(0);

      // Step 5: Developer requests payout
      const payoutResponse = await request(app)
        .post('/api/developers/payout')
        .set('Authorization', `Bearer ${developerToken}`)
        .send({
          amount: earningsResponse.body.availableBalance,
          method: 'STRIPE',
        });

      expect(payoutResponse.status).toBe(200);
    });
  });

  describe('App Discovery and Recommendation Flow', () => {
    it('should provide personalized app recommendations', async () => {
      // Step 1: User views multiple apps
      await request(app)
        .get(`/api/apps/${testApp.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Step 2: User downloads an app
      await request(app)
        .post(`/api/apps/${testApp.id}/download`)
        .set('Authorization', `Bearer ${userToken}`);

      // Step 3: User rates the app
      await request(app)
        .post(`/api/apps/${testApp.id}/reviews`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          rating: 5,
          comment: 'Great app!',
        });

      // Step 4: Get personalized recommendations
      const recommendationsResponse = await request(app)
        .get('/api/apps/recommendations')
        .set('Authorization', `Bearer ${userToken}`);

      expect(recommendationsResponse.status).toBe(200);
      expect(recommendationsResponse.body.recommendations).toBeDefined();
    });
  });

  describe('Admin Moderation Flow', () => {
    it('should handle complete app moderation workflow', async () => {
      // Step 1: Developer submits app for review
      const appResponse = await request(app)
        .post('/api/apps')
        .set('Authorization', `Bearer ${developerToken}`)
        .send({
          name: 'New App for Review',
          description: 'App pending review',
          category: 'GAMES',
          price: 4.99,
          downloadUrl: 'https://example.com/newapp.zip',
        });

      expect(appResponse.status).toBe(201);
      const newApp = appResponse.body;

      // Step 2: Admin reviews app
      const reviewResponse = await request(app)
        .get('/api/admin/apps/pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(reviewResponse.status).toBe(200);
      expect(reviewResponse.body.apps).toContainEqual(
        expect.objectContaining({ id: newApp.id })
      );

      // Step 3: Admin approves app
      const approvalResponse = await request(app)
        .patch(`/api/admin/apps/${newApp.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'APPROVED' });

      expect(approvalResponse.status).toBe(200);

      // Step 4: App appears in public listings
      const publicResponse = await request(app)
        .get('/api/apps')
        .query({ category: 'GAMES' });

      expect(publicResponse.status).toBe(200);
      expect(publicResponse.body.apps).toContainEqual(
        expect.objectContaining({ id: newApp.id })
      );
    });
  });

  describe('Security and Compliance Flow', () => {
    it('should enforce rate limiting and security measures', async () => {
      // Test rate limiting
      const requests = Array(11).fill(null).map(() =>
        request(app)
          .get('/api/apps')
          .set('Authorization', `Bearer ${userToken}`)
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should validate app security before approval', async () => {
      // Submit app with suspicious content
      const suspiciousAppResponse = await request(app)
        .post('/api/apps')
        .set('Authorization', `Bearer ${developerToken}`)
        .send({
          name: 'Suspicious App',
          description: 'This app contains malware keywords: virus, trojan, keylogger',
          category: 'PRODUCTIVITY',
          price: 0,
          downloadUrl: 'https://suspicious-site.com/malware.zip',
        });

      expect(suspiciousAppResponse.status).toBe(400);
      expect(suspiciousAppResponse.body.error).toContain('security');
    });
  });

  describe('Analytics and Reporting Flow', () => {
    it('should track and report analytics correctly', async () => {
      // Generate some activity
      await request(app)
        .get(`/api/apps/${testApp.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      await request(app)
        .post(`/api/apps/${testApp.id}/download`)
        .set('Authorization', `Bearer ${userToken}`);

      // Check developer analytics
      const analyticsResponse = await request(app)
        .get('/api/developers/analytics')
        .set('Authorization', `Bearer ${developerToken}`)
        .query({
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        });

      expect(analyticsResponse.status).toBe(200);
      expect(analyticsResponse.body.downloads).toBeGreaterThan(0);
      expect(analyticsResponse.body.views).toBeGreaterThan(0);

      // Check admin dashboard
      const dashboardResponse = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(dashboardResponse.status).toBe(200);
      expect(dashboardResponse.body.totalApps).toBeGreaterThan(0);
      expect(dashboardResponse.body.totalUsers).toBeGreaterThan(0);
    });
  });

  describe('Multi-currency and Global Payment Flow', () => {
    it('should handle different payment methods by region', async () => {
      // Test Indian user with Razorpay
      const indianUser = await prisma.user.create({
        data: {
          email: 'indian@example.com',
          password: 'hashedpassword',
          name: 'Indian User',
          country: 'IN',
          isVerified: true,
        },
      });

      const indianToken = generateJWT(indianUser.id);

      const indianOrderResponse = await request(app)
        .post('/api/payments/orders')
        .set('Authorization', `Bearer ${indianToken}`)
        .send({
          appId: testApp.id,
          paymentMethod: 'RAZORPAY',
        });

      expect(indianOrderResponse.status).toBe(201);
      expect(indianOrderResponse.body.gateway).toBe('RAZORPAY');

      // Test US user with Stripe
      const usUser = await prisma.user.create({
        data: {
          email: 'us@example.com',
          password: 'hashedpassword',
          name: 'US User',
          country: 'US',
          isVerified: true,
        },
      });

      const usToken = generateJWT(usUser.id);

      const usOrderResponse = await request(app)
        .post('/api/payments/orders')
        .set('Authorization', `Bearer ${usToken}`)
        .send({
          appId: testApp.id,
          paymentMethod: 'STRIPE',
        });

      expect(usOrderResponse.status).toBe(201);
      expect(usOrderResponse.body.gateway).toBe('STRIPE');
    });
  });
});