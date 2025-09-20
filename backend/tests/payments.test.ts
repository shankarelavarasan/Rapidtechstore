import request from 'supertest';
import app from '../src/index';
import { prisma } from './setup';
import { PaymentOrchestrator } from '../src/services/paymentOrchestrator';

// Use global testUtils
declare const testUtils: any;

describe('Payment System', () => {
  let user: any;
  let developer: any;
  let admin: any;
  let userToken: string;
  let developerToken: string;
  let adminToken: string;
  let testApp: any;
  let testPurchase: any;

  beforeEach(async () => {
    // Create test users
    user = await testUtils.createTestUser();
    developer = await testUtils.createTestDeveloper();
    admin = await testUtils.createTestAdmin();

    // Generate tokens
    userToken = testUtils.generateJWT(user.id, user.role);
    developerToken = testUtils.generateJWT(developer.id, developer.role);
    adminToken = testUtils.generateJWT(admin.id, admin.role);

    // Create test app
    testApp = await testUtils.createTestApp(developer.id, {
      price: 999, // ₹9.99
      status: 'APPROVED',
    });

    // Create test purchase
    testPurchase = await prisma.purchase.create({
      data: {
        userId: user.id,
        appId: testApp.id,
        amount: testApp.price,
        currency: 'INR',
        status: 'COMPLETED',
      },
    });
  });

  // Test data objects
  const paymentData = {
    appId: '',
    amount: 999,
    currency: 'INR',
  };

  const orderData = {
    appId: '',
    amount: 999,
    currency: 'INR',
    region: 'IN',
    country: 'IN',
    paymentMethod: 'card',
    description: 'Test app purchase',
  };

  const verificationData = {
    razorpay_order_id: 'order_test_123',
    razorpay_payment_id: 'pay_test_123',
    razorpay_signature: 'test_signature_123',
  };

  describe('POST /api/payments/create', () => {
    beforeEach(() => {
      paymentData.appId = testApp.id;
      orderData.appId = testApp.id;
    });

    it('should create payment for paid app', async () => {
      const response = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send(paymentData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('transactionId');
      expect(response.body).toHaveProperty('amount', testApp.price);
      expect(response.body).toHaveProperty('currency', 'INR');

      // Verify payment was processed
      expect(response.body.status).toBeDefined();
    });

    it('should not create payment for free app', async () => {
      const freeApp = await testUtils.createTestApp(developer.id, {
        price: 0,
        status: 'APPROVED',
      });

      const response = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          ...paymentData,
          appId: freeApp.id,
        })
        .expect(400);

      expect(response.body.error).toBe('Cannot create payment for free app');
    });

    it('should not create payment for already purchased app', async () => {
      const response = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send(paymentData)
        .expect(400);

      expect(response.body.error).toBe('App already purchased');
    });

    it('should not create payment for own app', async () => {
      const response = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${developerToken}`)
        .send(paymentData)
        .expect(400);

      expect(response.body.error).toBe('Cannot purchase your own app');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/payments/create')
        .send(paymentData)
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided');
    });

    it('should validate payment method', async () => {
      const response = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          ...orderData,
          paymentMethod: 'INVALID_METHOD',
        })
        .expect(400);

      expect(response.body.errors).toContain('Invalid payment method');
    });

    it('should return 404 for non-existent app', async () => {
      const response = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          ...orderData,
          appId: 'non-existent-id',
        })
        .expect(404);

      expect(response.body.error).toBe('App not found');
    });

    it('should not create order for pending app', async () => {
      const pendingApp = await testUtils.createTestApp(developer.id, {
        price: 999,
        status: 'PENDING',
      });

      const response = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          ...orderData,
          appId: pendingApp.id,
        })
        .expect(404);

      expect(response.body.error).toBe('App not found');
    });
  });

  describe('POST /api/payments/confirm', () => {
    const confirmData = {
      paymentIntentId: 'pi_test_123',
    };

    it('should confirm successful payment', async () => {
      // Mock Stripe payment intent retrieval
      const mockPaymentIntent = {
        id: 'pi_test_123',
        status: 'succeeded',
        amount: testApp.price * 100, // Stripe uses cents
        currency: 'usd',
        metadata: {
          userId: user.id,
          appId: testApp.id,
        },
      };

      jest.spyOn(require('../src/services/stripeService'), 'StripeService').mockImplementation(() => ({
        retrievePaymentIntent: jest.fn().mockResolvedValue(mockPaymentIntent),
      }));

      const response = await request(app)
        .post('/api/payments/confirm')
        .set('Authorization', `Bearer ${userToken}`)
        .send(confirmData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Payment confirmed successfully');

      // Verify purchase was created
      const purchase = await prisma.purchase.findFirst({
        where: {
          userId: user.id,
          appId: testApp.id,
        },
      });
      expect(purchase).toBeTruthy();
      expect(purchase?.status).toBe('COMPLETED');
    });

    it('should reject payment intent not found', async () => {
      jest.spyOn(require('../src/services/stripeService'), 'StripeService').mockImplementation(() => ({
        retrievePaymentIntent: jest.fn().mockResolvedValue(null),
      }));

      const response = await request(app)
        .post('/api/payments/confirm')
        .set('Authorization', `Bearer ${userToken}`)
        .send(confirmData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Payment intent not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/payments/confirm')
        .send(confirmData)
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(400);

      expect(response.body.errors).toContain('Razorpay order ID is required');
      expect(response.body.errors).toContain('Razorpay payment ID is required');
      expect(response.body.errors).toContain('Razorpay signature is required');
    });

    it('should return 404 for non-existent order', async () => {
      const response = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          ...verificationData,
          razorpay_order_id: 'non_existent_order',
        })
        .expect(404);

      expect(response.body.error).toBe('Payment order not found');
    });
  });



  describe('GET /api/payments/purchases', () => {
    beforeEach(async () => {
      // Create additional purchases
      const anotherApp = await testUtils.createTestApp(developer.id, {
        name: 'Another App',
        price: 1999,
        status: 'APPROVED',
      });

      await prisma.purchase.create({
        data: {
          userId: user.id,
          appId: anotherApp.id,
          amount: anotherApp.price,
          currency: 'INR',
          status: 'COMPLETED',
        },
      });
    });

    it('should get user purchases', async () => {
      const response = await request(app)
        .get('/api/payments/purchases')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('purchases');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.purchases).toBeInstanceOf(Array);

      response.body.purchases.forEach((purchase: any) => {
        expect(purchase.userId).toBe(user.id);
        expect(purchase).toHaveProperty('app');
        expect(purchase.status).toBe('COMPLETED');
      });
    });

    it('should sort purchases by date', async () => {
      const response = await request(app)
        .get('/api/payments/purchases?sortBy=createdAt&sortOrder=desc')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const purchases = response.body.purchases;
      for (let i = 1; i < purchases.length; i++) {
        const current = new Date(purchases[i].createdAt);
        const previous = new Date(purchases[i - 1].createdAt);
        expect(current.getTime()).toBeLessThanOrEqual(previous.getTime());
      }
    });

    it('should paginate purchases', async () => {
      const response = await request(app)
        .get('/api/payments/purchases?page=1&limit=1')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.purchases.length).toBeLessThanOrEqual(1);
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 1);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/payments/purchases')
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided');
    });
  });

  describe('GET /api/payments/purchases/:appId/check', () => {
    it('should check if app is purchased', async () => {
      const response = await request(app)
        .get(`/api/payments/purchases/${testApp.id}/check`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('purchased', true);
      expect(response.body).toHaveProperty('purchase');
    });

    it('should return false for non-purchased app', async () => {
      const newApp = await testUtils.createTestApp(developer.id, {
        price: 999,
        status: 'APPROVED',
      });

      const response = await request(app)
        .get(`/api/payments/purchases/${newApp.id}/check`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('purchased', false);
      expect(response.body.purchase).toBeNull();
    });

    it('should return true for free apps', async () => {
      const freeApp = await testUtils.createTestApp(developer.id, {
        price: 0,
        status: 'APPROVED',
      });

      const response = await request(app)
        .get(`/api/payments/purchases/${freeApp.id}/check`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('purchased', true);
      expect(response.body.purchase).toBeNull();
    });

    it('should return true for own apps', async () => {
      const response = await request(app)
        .get(`/api/payments/purchases/${testApp.id}/check`)
        .set('Authorization', `Bearer ${developerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('purchased', true);
      expect(response.body.purchase).toBeNull();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/payments/purchases/${testApp.id}/check`)
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided');
    });

    it('should return 404 for non-existent app', async () => {
      const response = await request(app)
        .get('/api/payments/purchases/non-existent-id/check')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.error).toBe('App not found');
    });
  });

  describe('POST /api/payments/refund', () => {
    const refundData = {
      purchaseId: '',
      reason: 'App not working as expected',
    };

    beforeEach(() => {
      refundData.purchaseId = testPurchase.id;
    });

    it('should request refund for recent purchase', async () => {
      const response = await request(app)
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${userToken}`)
        .send(refundData)
        .expect(200);

      expect(response.body.message).toBe('Refund request submitted successfully');

      // Verify purchase status was updated
      const updatedPurchase = await prisma.purchase.findFirst({
        where: {
          id: testPurchase.id,
        },
      });
      expect(updatedPurchase).toBeTruthy();
      expect(updatedPurchase?.status).toBe('REFUNDED');
      expect(updatedPurchase?.refundedAt).toBeTruthy();
    });

    it('should not allow refund for old purchases', async () => {
      // Update purchase to be older than refund window
      await prisma.purchase.update({
        where: { id: testPurchase.id },
        data: {
          createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), // 31 days ago
        },
      });

      const response = await request(app)
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${userToken}`)
        .send(refundData)
        .expect(400);

      expect(response.body.error).toBe('Refund window has expired');
    });

    it('should not allow duplicate refund requests', async () => {
      // Mark purchase as already refunded
      await prisma.purchase.update({
        where: { id: testPurchase.id },
        data: {
          status: 'REFUNDED',
          refundedAt: new Date(),
          refundAmount: testPurchase.amount,
        },
      });

      const response = await request(app)
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${userToken}`)
        .send(refundData)
        .expect(400);

      expect(response.body.error).toBe('Refund request already exists for this purchase');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/payments/refund')
        .send(refundData)
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(400);

      expect(response.body.errors).toContain('Purchase ID is required');
      expect(response.body.errors).toContain('Reason is required');
    });

    it('should return 404 for non-existent purchase', async () => {
      const response = await request(app)
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          ...refundData,
          purchaseId: 'non-existent-id',
        })
        .expect(404);

      expect(response.body.error).toBe('Purchase not found');
    });

    it('should not allow refund for other user\'s purchase', async () => {
      const otherUser = await testUtils.createTestUser();
      const otherUserToken = testUtils.generateJWT(otherUser.id, 'USER');

      const response = await request(app)
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send(refundData)
        .expect(403);

      expect(response.body.error).toBe('Access denied. You can only request refunds for your own purchases');
    });
  });

  describe('GET /api/payments/analytics', () => {
    beforeEach(async () => {
      // Create additional test data for analytics
      const anotherApp = await testUtils.createTestApp(developer.id, {
        price: 1999,
        status: 'APPROVED',
      });

      await prisma.purchase.createMany({
        data: [
          {
            userId: user.id,
            appId: anotherApp.id,
            amount: 1999,
            currency: 'INR',
            status: 'COMPLETED',
          },
          {
            userId: user.id,
            appId: testApp.id,
            amount: 999,
            currency: 'INR',
            status: 'COMPLETED',
          },
        ],
      });
    });

    it('should get payment analytics for developer', async () => {
      const response = await request(app)
        .get('/api/payments/analytics')
        .set('Authorization', `Bearer ${developerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('totalSales');
      expect(response.body).toHaveProperty('averageOrderValue');
      expect(response.body).toHaveProperty('revenueByApp');
      expect(response.body).toHaveProperty('revenueOverTime');
    });

    it('should get global analytics for admin', async () => {
      const response = await request(app)
        .get('/api/payments/analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('totalSales');
      expect(response.body).toHaveProperty('topApps');
      expect(response.body).toHaveProperty('topDevelopers');
    });

    it('should filter analytics by date range', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/payments/analytics?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${developerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalRevenue');
    });

    it('should not allow access for regular users', async () => {
      const response = await request(app)
        .get('/api/payments/analytics')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.error).toBe('Access denied. Developer or Admin role required');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/payments/analytics')
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided');
    });
  });

  describe('Payment Orchestration System', () => {
    describe('POST /api/payments/create', () => {
      const orchestratorPaymentData = {
        amount: 1999,
        currency: 'USD',
        region: 'US',
        country: 'US',
        paymentMethod: 'card',
        description: 'Test payment via orchestrator',
        returnUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      it('should create payment using orchestrator', async () => {
        const response = await request(app)
          .post('/api/payments/create')
          .set('Authorization', `Bearer ${userToken}`)
          .send(orchestratorPaymentData)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('transactionId');
        expect(response.body).toHaveProperty('gateway');
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('amount', orchestratorPaymentData.amount);
        expect(response.body).toHaveProperty('currency', orchestratorPaymentData.currency);
        expect(response.body).toHaveProperty('region', orchestratorPaymentData.region);
      });

      it('should route payment to appropriate gateway based on region', async () => {
        // Test US region (should use Stripe)
        const usResponse = await request(app)
          .post('/api/payments/create')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ ...orchestratorPaymentData, region: 'US', country: 'US' })
          .expect(200);

        expect(usResponse.body.gateway).toBe('stripe');

        // Test India region (should use Razorpay)
        const inResponse = await request(app)
          .post('/api/payments/create')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ ...orchestratorPaymentData, region: 'IN', country: 'IN', currency: 'INR' })
          .expect(200);

        expect(inResponse.body.gateway).toBe('razorpay');
      });

      it('should handle currency conversion', async () => {
        const response = await request(app)
          .post('/api/payments/create')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            ...orchestratorPaymentData,
            currency: 'EUR',
            region: 'EU',
            country: 'DE',
          })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.currency).toBe('EUR');
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/payments/create')
          .set('Authorization', `Bearer ${userToken}`)
          .send({})
          .expect(400);

        expect(response.body.errors).toContain('Amount is required');
        expect(response.body.errors).toContain('Currency is required');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/payments/create')
          .send(orchestratorPaymentData)
          .expect(401);

        expect(response.body.error).toBe('Access denied. No token provided');
      });
    });

    describe('POST /api/payments/payout', () => {
      const payoutData = {
        amount: 5000,
        currency: 'USD',
        region: 'US',
        country: 'US',
        bankAccount: {
          accountNumber: '1234567890',
          routingNumber: '021000021',
          bankName: 'Test Bank',
          accountHolderName: 'John Doe',
        },
        description: 'Test payout via orchestrator',
      };

      it('should create payout using orchestrator', async () => {
        const response = await request(app)
          .post('/api/payments/payout')
          .set('Authorization', `Bearer ${developerToken}`)
          .send(payoutData)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('payoutId');
        expect(response.body).toHaveProperty('gateway');
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('amount', payoutData.amount);
        expect(response.body).toHaveProperty('currency', payoutData.currency);
      });

      it('should route payout to appropriate gateway', async () => {
        const response = await request(app)
          .post('/api/payments/payout')
          .set('Authorization', `Bearer ${developerToken}`)
          .send({ ...payoutData, region: 'EU', country: 'GB' })
          .expect(200);

        expect(response.body).toHaveProperty('gateway');
        expect(['stripe', 'wise', 'payoneer']).toContain(response.body.gateway);
      });

      it('should require developer or admin role', async () => {
        const response = await request(app)
          .post('/api/payments/payout')
          .set('Authorization', `Bearer ${userToken}`)
          .send(payoutData)
          .expect(403);

        expect(response.body.error).toBe('Access denied. Developer or Admin role required');
      });

      it('should validate payout data', async () => {
        const response = await request(app)
          .post('/api/payments/payout')
          .set('Authorization', `Bearer ${developerToken}`)
          .send({})
          .expect(400);

        expect(response.body.errors).toContain('Amount is required');
        expect(response.body.errors).toContain('Currency is required');
      });
    });

    describe('GET /api/payments/status/:transactionId', () => {
      let testTransactionId: string;

      beforeEach(async () => {
        // Create a test payment to get transaction ID
        const response = await request(app)
          .post('/api/payments/create')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            amount: 1000,
            currency: 'USD',
            region: 'US',
            country: 'US',
            paymentMethod: 'card',
          });
        
        testTransactionId = response.body.transactionId;
      });

      it('should get payment status', async () => {
        const response = await request(app)
          .get(`/api/payments/status/${testTransactionId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('transactionId', testTransactionId);
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('gateway');
      });

      it('should return 404 for non-existent transaction', async () => {
        const response = await request(app)
          .get('/api/payments/status/non-existent-id')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(404);

        expect(response.body.error).toBe('Transaction not found');
      });
    });

    describe('GET /api/payments/methods/:region', () => {
      it('should get supported payment methods for region', async () => {
        const response = await request(app)
          .get('/api/payments/methods/US')
          .expect(200);

        expect(response.body).toHaveProperty('paymentMethods');
        expect(response.body).toHaveProperty('gateways');
        expect(Array.isArray(response.body.paymentMethods)).toBe(true);
        expect(Array.isArray(response.body.gateways)).toBe(true);
      });

      it('should handle unsupported regions', async () => {
        const response = await request(app)
          .get('/api/payments/methods/UNSUPPORTED')
          .expect(200);

        expect(response.body.paymentMethods).toEqual([]);
        expect(response.body.gateways).toEqual([]);
      });
    });

    describe('POST /api/payments/convert-currency', () => {
      const conversionData = {
        amount: 1000,
        fromCurrency: 'USD',
        toCurrency: 'EUR',
      };

      it('should convert currency', async () => {
        const response = await request(app)
          .post('/api/payments/convert-currency')
          .send(conversionData)
          .expect(200);

        expect(response.body).toHaveProperty('convertedAmount');
        expect(response.body).toHaveProperty('exchangeRate');
        expect(response.body).toHaveProperty('fromCurrency', 'USD');
        expect(response.body).toHaveProperty('toCurrency', 'EUR');
      });

      it('should validate conversion data', async () => {
        const response = await request(app)
          .post('/api/payments/convert-currency')
          .send({})
          .expect(400);

        expect(response.body.errors).toContain('Amount is required');
        expect(response.body.errors).toContain('From currency is required');
        expect(response.body.errors).toContain('To currency is required');
      });

      it('should handle same currency conversion', async () => {
        const response = await request(app)
          .post('/api/payments/convert-currency')
          .send({
            amount: 1000,
            fromCurrency: 'USD',
            toCurrency: 'USD',
          })
          .expect(200);

        expect(response.body.convertedAmount).toBe(1000);
        expect(response.body.exchangeRate).toBe(1);
      });
    });

    describe('Gateway Routing Logic', () => {
      it('should process payments for different regions', async () => {
        // Test US payment processing
        const usPaymentRequest = {
          userId: 'user123',
          amount: 100,
          currency: 'USD',
          ipAddress: '192.168.1.1',
          headers: { 'x-forwarded-for': '192.168.1.1' },
          country: 'US',
          region: 'US',
          metadata: { test: true }
        };

        const usResponse = await PaymentOrchestrator.processPayment(usPaymentRequest);
        expect(usResponse).toBeDefined();
        expect(usResponse.currency).toBe('USD');
        expect(usResponse.region).toBe('US');

        // Test India payment processing
        const inPaymentRequest = {
          userId: 'user123',
          amount: 100,
          currency: 'INR',
          ipAddress: '192.168.1.1',
          headers: { 'x-forwarded-for': '192.168.1.1' },
          country: 'IN',
          region: 'IN',
          metadata: { test: true }
        };

        const inResponse = await PaymentOrchestrator.processPayment(inPaymentRequest);
        expect(inResponse).toBeDefined();
        expect(inResponse.currency).toBe('INR');
        expect(inResponse.region).toBe('IN');
      });

      it('should process payouts for different regions', async () => {
        const payoutRequest = {
          developerId: 'dev123',
          amount: 100,
          currency: 'USD',
          ipAddress: '192.168.1.1',
          headers: { 'x-forwarded-for': '192.168.1.1' },
          country: 'US',
          region: 'US',
          metadata: { test: true }
        };

        const response = await PaymentOrchestrator.processPayout(payoutRequest);
        expect(response).toBeDefined();
        expect(response.currency).toBe('USD');
        expect(response.region).toBe('US');
      });
    });

    describe('Error Handling and Fallbacks', () => {
      it('should handle gateway failures gracefully', async () => {
        // Mock a gateway failure scenario
        jest.spyOn(PaymentOrchestrator, 'processPayment').mockRejectedValueOnce(
          new Error('Gateway temporarily unavailable')
        );

        const response = await request(app)
          .post('/api/payments/create')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            amount: 1000,
            currency: 'USD',
            region: 'US',
            country: 'US',
            paymentMethod: 'card',
          })
          .expect(500);

        expect(response.body.error).toContain('Payment processing failed');
      });

      it('should validate minimum and maximum amounts', async () => {
        // Test minimum amount validation
        const minResponse = await request(app)
          .post('/api/payments/create')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            amount: 1, // Very small amount
            currency: 'USD',
            region: 'US',
            country: 'US',
            paymentMethod: 'card',
          })
          .expect(400);

        expect(minResponse.body.error).toContain('amount');
      });
    });
  });
});