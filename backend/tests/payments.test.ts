import request from 'supertest';
import { app } from '../src/index';
import { prisma } from './setup';

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
        paymentMethod: 'RAZORPAY',
        transactionId: 'test_txn_123',
      },
    });
  });

  describe('POST /api/payments/create-order', () => {
    const orderData = {
      appId: '',
      paymentMethod: 'RAZORPAY',
    };

    beforeEach(() => {
      orderData.appId = testApp.id;
    });

    it('should create payment order for paid app', async () => {
      const response = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(200);

      expect(response.body).toHaveProperty('orderId');
      expect(response.body).toHaveProperty('amount', testApp.price);
      expect(response.body).toHaveProperty('currency', 'INR');
      expect(response.body).toHaveProperty('key');

      // Verify order was created in database
      const order = await prisma.paymentOrder.findFirst({
        where: {
          userId: user.id,
          appId: testApp.id,
        },
      });
      expect(order).toBeTruthy();
      expect(order?.status).toBe('PENDING');
    });

    it('should not create order for free app', async () => {
      const freeApp = await testUtils.createTestApp(developer.id, {
        price: 0,
        status: 'APPROVED',
      });

      const response = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          ...orderData,
          appId: freeApp.id,
        })
        .expect(400);

      expect(response.body.error).toBe('Cannot create payment order for free app');
    });

    it('should not create order for already purchased app', async () => {
      const response = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(400);

      expect(response.body.error).toBe('App already purchased');
    });

    it('should not create order for own app', async () => {
      const response = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${developerToken}`)
        .send(orderData)
        .expect(400);

      expect(response.body.error).toBe('Cannot purchase your own app');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/payments/create-order')
        .send(orderData)
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

  describe('POST /api/payments/verify', () => {
    let paymentOrder: any;

    beforeEach(async () => {
      // Create a pending payment order
      paymentOrder = await prisma.paymentOrder.create({
        data: {
          userId: user.id,
          appId: testApp.id,
          amount: testApp.price,
          currency: 'INR',
          status: 'PENDING',
          paymentMethod: 'RAZORPAY',
          razorpayOrderId: 'order_test_123',
        },
      });
    });

    const verificationData = {
      razorpay_order_id: 'order_test_123',
      razorpay_payment_id: 'pay_test_123',
      razorpay_signature: 'test_signature',
    };

    it('should verify successful payment', async () => {
      // Mock Razorpay verification
      jest.spyOn(require('crypto'), 'createHmac').mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('test_signature'),
      });

      const response = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${userToken}`)
        .send(verificationData)
        .expect(200);

      expect(response.body.message).toBe('Payment verified successfully');
      expect(response.body).toHaveProperty('purchase');

      // Verify purchase was created
      const purchase = await prisma.purchase.findFirst({
        where: {
          userId: user.id,
          appId: testApp.id,
        },
      });
      expect(purchase).toBeTruthy();
      expect(purchase?.status).toBe('COMPLETED');

      // Verify payment order was updated
      const updatedOrder = await prisma.paymentOrder.findUnique({
        where: { id: paymentOrder.id },
      });
      expect(updatedOrder?.status).toBe('COMPLETED');
    });

    it('should reject invalid signature', async () => {
      // Mock Razorpay verification with invalid signature
      jest.spyOn(require('crypto'), 'createHmac').mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('invalid_signature'),
      });

      const response = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${userToken}`)
        .send(verificationData)
        .expect(400);

      expect(response.body.error).toBe('Invalid payment signature');

      // Verify payment order was marked as failed
      const updatedOrder = await prisma.paymentOrder.findUnique({
        where: { id: paymentOrder.id },
      });
      expect(updatedOrder?.status).toBe('FAILED');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/payments/verify')
        .send(verificationData)
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

  describe('GET /api/payments/orders', () => {
    beforeEach(async () => {
      // Create additional payment orders
      await prisma.paymentOrder.createMany({
        data: [
          {
            userId: user.id,
            appId: testApp.id,
            amount: 1999,
            currency: 'INR',
            status: 'COMPLETED',
            paymentMethod: 'RAZORPAY',
            razorpayOrderId: 'order_completed',
          },
          {
            userId: user.id,
            appId: testApp.id,
            amount: 999,
            currency: 'INR',
            status: 'PENDING',
            paymentMethod: 'RAZORPAY',
            razorpayOrderId: 'order_pending',
          },
          {
            userId: user.id,
            appId: testApp.id,
            amount: 1499,
            currency: 'INR',
            status: 'FAILED',
            paymentMethod: 'RAZORPAY',
            razorpayOrderId: 'order_failed',
          },
        ],
      });
    });

    it('should get user payment orders', async () => {
      const response = await request(app)
        .get('/api/payments/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('orders');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.orders).toBeInstanceOf(Array);

      response.body.orders.forEach((order: any) => {
        expect(order.userId).toBe(user.id);
        expect(order).toHaveProperty('app');
      });
    });

    it('should filter orders by status', async () => {
      const response = await request(app)
        .get('/api/payments/orders?status=COMPLETED')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      response.body.orders.forEach((order: any) => {
        expect(order.status).toBe('COMPLETED');
      });
    });

    it('should sort orders by creation date', async () => {
      const response = await request(app)
        .get('/api/payments/orders?sortBy=createdAt&sortOrder=desc')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const orders = response.body.orders;
      for (let i = 1; i < orders.length; i++) {
        const current = new Date(orders[i].createdAt);
        const previous = new Date(orders[i - 1].createdAt);
        expect(current.getTime()).toBeLessThanOrEqual(previous.getTime());
      }
    });

    it('should paginate orders', async () => {
      const response = await request(app)
        .get('/api/payments/orders?page=1&limit=2')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.orders.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 2);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/payments/orders')
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided');
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
          paymentMethod: 'RAZORPAY',
          transactionId: 'test_txn_456',
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

      // Verify refund request was created
      const refundRequest = await prisma.refundRequest.findFirst({
        where: {
          purchaseId: testPurchase.id,
        },
      });
      expect(refundRequest).toBeTruthy();
      expect(refundRequest?.status).toBe('PENDING');
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
      // Create existing refund request
      await prisma.refundRequest.create({
        data: {
          purchaseId: testPurchase.id,
          reason: 'Test reason',
          status: 'PENDING',
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
            paymentMethod: 'RAZORPAY',
            transactionId: 'test_txn_analytics_1',
          },
          {
            userId: user.id,
            appId: testApp.id,
            amount: 999,
            currency: 'INR',
            status: 'COMPLETED',
            paymentMethod: 'PAYPAL',
            transactionId: 'test_txn_analytics_2',
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
      expect(response.body).toHaveProperty('salesByPaymentMethod');
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
});