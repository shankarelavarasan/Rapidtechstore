import request from 'supertest';
import app from '../src/index';
import { prisma } from './setup';

describe('Admin Functionality', () => {
  let user: any;
  let developer: any;
  let admin: any;
  let userToken: string;
  let developerToken: string;
  let adminToken: string;
  let testApp: any;

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
      status: 'PENDING',
    });
  });

  describe('GET /api/admin/dashboard', () => {
    beforeEach(async () => {
      // Create test data for dashboard
      await testUtils.createTestApp(developer.id, { status: 'APPROVED' });
      await testUtils.createTestApp(developer.id, { status: 'REJECTED' });
      
      await prisma.purchase.create({
        data: {
          userId: user.id,
          appId: testApp.id,
          amount: 999,
          currency: 'INR',
          status: 'COMPLETED',
        },
      });
    });

    it('should get admin dashboard data', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('totalUsers');
      expect(response.body.stats).toHaveProperty('totalDevelopers');
      expect(response.body.stats).toHaveProperty('totalApps');
      expect(response.body.stats).toHaveProperty('pendingApps');
      expect(response.body.stats).toHaveProperty('totalRevenue');
      expect(response.body.stats).toHaveProperty('totalDownloads');

      expect(response.body).toHaveProperty('recentApps');
      expect(response.body).toHaveProperty('recentUsers');
      expect(response.body).toHaveProperty('revenueChart');
      expect(response.body).toHaveProperty('topApps');
    });

    it('should not allow access for non-admin users', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.error).toBe('Access denied. Admin role required');
    });

    it('should not allow access for developers', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${developerToken}`)
        .expect(403);

      expect(response.body.error).toBe('Access denied. Admin role required');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided');
    });
  });

  describe('GET /api/admin/apps', () => {
    beforeEach(async () => {
      // Create apps with different statuses
      await testUtils.createTestApp(developer.id, { 
        name: 'Approved App',
        status: 'APPROVED' 
      });
      await testUtils.createTestApp(developer.id, { 
        name: 'Rejected App',
        status: 'REJECTED' 
      });
    });

    it('should get all apps for admin', async () => {
      const response = await request(app)
        .get('/api/admin/apps')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('apps');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.apps).toBeInstanceOf(Array);

      response.body.apps.forEach((app: any) => {
        expect(app).toHaveProperty('id');
        expect(app).toHaveProperty('name');
        expect(app).toHaveProperty('status');
        expect(app).toHaveProperty('developer');
      });
    });

    it('should filter apps by status', async () => {
      const response = await request(app)
        .get('/api/admin/apps?status=PENDING')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.apps.forEach((app: any) => {
        expect(app.status).toBe('PENDING');
      });
    });

    it('should search apps by name', async () => {
      const response = await request(app)
        .get('/api/admin/apps?search=Approved')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.apps.forEach((app: any) => {
        expect(app.name.toLowerCase()).toContain('approved');
      });
    });

    it('should sort apps by creation date', async () => {
      const response = await request(app)
        .get('/api/admin/apps?sortBy=createdAt&sortOrder=desc')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const apps = response.body.apps;
      for (let i = 1; i < apps.length; i++) {
        const current = new Date(apps[i].createdAt);
        const previous = new Date(apps[i - 1].createdAt);
        expect(current.getTime()).toBeLessThanOrEqual(previous.getTime());
      }
    });

    it('should paginate apps', async () => {
      const response = await request(app)
        .get('/api/admin/apps?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.apps.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 2);
    });

    it('should not allow access for non-admin users', async () => {
      const response = await request(app)
        .get('/api/admin/apps')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.error).toBe('Access denied. Admin role required');
    });
  });

  describe('PUT /api/admin/apps/:id/status', () => {
    const statusUpdateData = {
      status: 'APPROVED',
      reviewNotes: 'App meets all requirements',
    };

    it('should approve app', async () => {
      const response = await request(app)
        .put(`/api/admin/apps/${testApp.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(statusUpdateData)
        .expect(200);

      expect(response.body.status).toBe('APPROVED');
      expect(response.body.reviewNotes).toBe(statusUpdateData.reviewNotes);

      // Verify app was updated in database
      const updatedApp = await prisma.app.findUnique({
        where: { id: testApp.id },
      });
      expect(updatedApp?.status).toBe('APPROVED');
    });

    it('should reject app', async () => {
      const rejectData = {
        status: 'REJECTED',
        reviewNotes: 'App violates content policy',
      };

      const response = await request(app)
        .put(`/api/admin/apps/${testApp.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(rejectData)
        .expect(200);

      expect(response.body.status).toBe('REJECTED');
      expect(response.body.reviewNotes).toBe(rejectData.reviewNotes);
    });

    it('should validate status enum', async () => {
      const response = await request(app)
        .put(`/api/admin/apps/${testApp.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'INVALID_STATUS',
        })
        .expect(400);

      expect(response.body.errors).toContain('Invalid status');
    });

    it('should require review notes for rejection', async () => {
      const response = await request(app)
        .put(`/api/admin/apps/${testApp.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'REJECTED',
        })
        .expect(400);

      expect(response.body.errors).toContain('Review notes are required for rejection');
    });

    it('should not allow access for non-admin users', async () => {
      const response = await request(app)
        .put(`/api/admin/apps/${testApp.id}/status`)
        .set('Authorization', `Bearer ${developerToken}`)
        .send(statusUpdateData)
        .expect(403);

      expect(response.body.error).toBe('Access denied. Admin role required');
    });

    it('should return 404 for non-existent app', async () => {
      const response = await request(app)
        .put('/api/admin/apps/non-existent-id/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(statusUpdateData)
        .expect(404);

      expect(response.body.error).toBe('App not found');
    });
  });

  describe('GET /api/admin/users', () => {
    beforeEach(async () => {
      // Create additional test users
      await testUtils.createTestUser();
      await testUtils.createTestDeveloper();
    });

    it('should get all users for admin', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.users).toBeInstanceOf(Array);

      response.body.users.forEach((user: any) => {
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('role');
        expect(user).toHaveProperty('isActive');
        expect(user).not.toHaveProperty('password');
      });
    });

    it('should filter users by role', async () => {
      const response = await request(app)
        .get('/api/admin/users?role=DEVELOPER')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.users.forEach((user: any) => {
        expect(user.role).toBe('DEVELOPER');
      });
    });

    it('should filter users by active status', async () => {
      const response = await request(app)
        .get('/api/admin/users?isActive=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.users.forEach((user: any) => {
        expect(user.isActive).toBe(true);
      });
    });

    it('should search users by email', async () => {
      const response = await request(app)
        .get(`/api/admin/users?search=${user.email}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.users.length).toBeGreaterThan(0);
      response.body.users.forEach((u: any) => {
        expect(u.email.toLowerCase()).toContain(user.email.toLowerCase());
      });
    });

    it('should not allow access for non-admin users', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.error).toBe('Access denied. Admin role required');
    });
  });

  describe('PUT /api/admin/users/:id/status', () => {
    it('should deactivate user', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${user.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(response.body.isActive).toBe(false);

      // Verify user was updated in database
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(updatedUser?.isActive).toBe(false);
    });

    it('should activate user', async () => {
      // First deactivate user
      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: false },
      });

      const response = await request(app)
        .put(`/api/admin/users/${user.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true })
        .expect(200);

      expect(response.body.isActive).toBe(true);
    });

    it('should not allow deactivating admin users', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${admin.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(400);

      expect(response.body.error).toBe('Cannot deactivate admin users');
    });

    it('should not allow access for non-admin users', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${user.id}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ isActive: false })
        .expect(403);

      expect(response.body.error).toBe('Access denied. Admin role required');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .put('/api/admin/users/non-existent-id/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });
  });

  describe('GET /api/admin/reports', () => {
    beforeEach(async () => {
      // Create test reports
      const review = await prisma.review.create({
        data: {
          rating: 1,
          comment: 'Spam review',
          userId: user.id,
          appId: testApp.id,
        },
      });

      await prisma.reviewReport.create({
        data: {
          reviewId: review.id,
          reporterId: developer.id,
          reason: 'SPAM',
          description: 'This is clearly spam',
        },
      });

      await prisma.appReport.create({
        data: {
          appId: testApp.id,
          reporterId: user.id,
          reason: 'INAPPROPRIATE_CONTENT',
          description: 'App contains inappropriate content',
        },
      });
    });

    it('should get all reports for admin', async () => {
      const response = await request(app)
        .get('/api/admin/reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('reports');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.reports).toBeInstanceOf(Array);

      response.body.reports.forEach((report: any) => {
        expect(report).toHaveProperty('id');
        expect(report).toHaveProperty('type');
        expect(report).toHaveProperty('reason');
        expect(report).toHaveProperty('status');
        expect(report).toHaveProperty('reporter');
      });
    });

    it('should filter reports by type', async () => {
      const response = await request(app)
        .get('/api/admin/reports?type=REVIEW')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.reports.forEach((report: any) => {
        expect(report.type).toBe('REVIEW');
      });
    });

    it('should filter reports by status', async () => {
      const response = await request(app)
        .get('/api/admin/reports?status=PENDING')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.reports.forEach((report: any) => {
        expect(report.status).toBe('PENDING');
      });
    });

    it('should not allow access for non-admin users', async () => {
      const response = await request(app)
        .get('/api/admin/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.error).toBe('Access denied. Admin role required');
    });
  });

  describe('PUT /api/admin/reports/:id/resolve', () => {
    let reviewReport: any;

    beforeEach(async () => {
      const review = await prisma.review.create({
        data: {
          rating: 1,
          comment: 'Spam review',
          userId: user.id,
          appId: testApp.id,
        },
      });

      reviewReport = await prisma.reviewReport.create({
        data: {
          reviewId: review.id,
          reporterId: developer.id,
          reason: 'SPAM',
          description: 'This is clearly spam',
        },
      });
    });

    it('should resolve report', async () => {
      const resolveData = {
        action: 'REMOVE_CONTENT',
        adminNotes: 'Content removed for violating guidelines',
      };

      const response = await request(app)
        .put(`/api/admin/reports/${reviewReport.id}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(resolveData)
        .expect(200);

      expect(response.body.status).toBe('RESOLVED');
      expect(response.body.action).toBe(resolveData.action);
      expect(response.body.adminNotes).toBe(resolveData.adminNotes);
    });

    it('should dismiss report', async () => {
      const dismissData = {
        action: 'DISMISS',
        adminNotes: 'Report is not valid',
      };

      const response = await request(app)
        .put(`/api/admin/reports/${reviewReport.id}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(dismissData)
        .expect(200);

      expect(response.body.status).toBe('RESOLVED');
      expect(response.body.action).toBe(dismissData.action);
    });

    it('should validate action enum', async () => {
      const response = await request(app)
        .put(`/api/admin/reports/${reviewReport.id}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'INVALID_ACTION',
        })
        .expect(400);

      expect(response.body.errors).toContain('Invalid action');
    });

    it('should not allow access for non-admin users', async () => {
      const response = await request(app)
        .put(`/api/admin/reports/${reviewReport.id}/resolve`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          action: 'DISMISS',
        })
        .expect(403);

      expect(response.body.error).toBe('Access denied. Admin role required');
    });

    it('should return 404 for non-existent report', async () => {
      const response = await request(app)
        .put('/api/admin/reports/non-existent-id/resolve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'DISMISS',
        })
        .expect(404);

      expect(response.body.error).toBe('Report not found');
    });
  });

  describe('GET /api/admin/analytics', () => {
    beforeEach(async () => {
      // Create test data for analytics
      await prisma.purchase.createMany({
        data: [
          {
            userId: user.id,
            appId: testApp.id,
            amount: 999,
            currency: 'INR',
            status: 'COMPLETED',
            paymentMethod: 'RAZORPAY',
          },
          {
            userId: user.id,
            appId: testApp.id,
            amount: 1999,
            currency: 'INR',
            status: 'COMPLETED',
            paymentMethod: 'PAYPAL',
          },
        ],
      });
    });

    it('should get comprehensive analytics for admin', async () => {
      const response = await request(app)
        .get('/api/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('overview');
      expect(response.body.overview).toHaveProperty('totalUsers');
      expect(response.body.overview).toHaveProperty('totalApps');
      expect(response.body.overview).toHaveProperty('totalRevenue');
      expect(response.body.overview).toHaveProperty('totalDownloads');

      expect(response.body).toHaveProperty('revenue');
      expect(response.body.revenue).toHaveProperty('total');
      expect(response.body.revenue).toHaveProperty('overTime');

      expect(response.body).toHaveProperty('apps');
      expect(response.body.apps).toHaveProperty('byCategory');
      expect(response.body.apps).toHaveProperty('byStatus');
      expect(response.body.apps).toHaveProperty('topPerforming');

      expect(response.body).toHaveProperty('users');
      expect(response.body.users).toHaveProperty('byRole');
      expect(response.body.users).toHaveProperty('registrationOverTime');
      expect(response.body.users).toHaveProperty('activeUsers');
    });

    it('should filter analytics by date range', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/admin/analytics?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('overview');
    });

    it('should not allow access for non-admin users', async () => {
      const response = await request(app)
        .get('/api/admin/analytics')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.error).toBe('Access denied. Admin role required');
    });
  });

  describe('POST /api/admin/categories', () => {
    const categoryData = {
      name: 'New Category',
      description: 'A new app category',
      iconUrl: 'https://example.com/icon.png',
    };

    it('should create new category', async () => {
      const response = await request(app)
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(categoryData)
        .expect(201);

      expect(response.body.name).toBe(categoryData.name);
      expect(response.body.description).toBe(categoryData.description);
      expect(response.body.iconUrl).toBe(categoryData.iconUrl);
    });

    it('should validate unique category name', async () => {
      // Create first category
      await request(app)
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(categoryData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(categoryData)
        .expect(400);

      expect(response.body.error).toContain('Category name already exists');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body.errors).toContain('Name is required');
      expect(response.body.errors).toContain('Description is required');
    });

    it('should not allow access for non-admin users', async () => {
      const response = await request(app)
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${userToken}`)
        .send(categoryData)
        .expect(403);

      expect(response.body.error).toBe('Access denied. Admin role required');
    });
  });
});