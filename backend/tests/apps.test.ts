import request from 'supertest';
import { app } from '../src/index';
import { prisma } from './setup';

describe('App Management', () => {
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
    testApp = await testUtils.createTestApp(developer.id);
  });

  describe('GET /api/apps', () => {
    beforeEach(async () => {
      // Create additional test apps
      await testUtils.createTestApp(developer.id, {
        name: 'Productivity App',
        category: 'PRODUCTIVITY',
        price: 999,
        status: 'APPROVED',
      });
      
      await testUtils.createTestApp(developer.id, {
        name: 'Game App',
        category: 'GAMES',
        price: 0,
        status: 'APPROVED',
      });

      await testUtils.createTestApp(developer.id, {
        name: 'Pending App',
        status: 'PENDING',
      });
    });

    it('should get all approved apps', async () => {
      const response = await request(app)
        .get('/api/apps')
        .expect(200);

      expect(response.body).toHaveProperty('apps');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.apps).toBeInstanceOf(Array);
      
      // Should only return approved apps
      response.body.apps.forEach((app: any) => {
        expect(app.status).toBe('APPROVED');
      });
    });

    it('should filter apps by category', async () => {
      const response = await request(app)
        .get('/api/apps?category=PRODUCTIVITY')
        .expect(200);

      response.body.apps.forEach((app: any) => {
        expect(app.category).toBe('PRODUCTIVITY');
      });
    });

    it('should filter apps by platform', async () => {
      const response = await request(app)
        .get('/api/apps?platform=ANDROID')
        .expect(200);

      response.body.apps.forEach((app: any) => {
        expect(app.platform).toBe('ANDROID');
      });
    });

    it('should filter free apps', async () => {
      const response = await request(app)
        .get('/api/apps?free=true')
        .expect(200);

      response.body.apps.forEach((app: any) => {
        expect(app.price).toBe(0);
      });
    });

    it('should filter paid apps', async () => {
      const response = await request(app)
        .get('/api/apps?free=false')
        .expect(200);

      response.body.apps.forEach((app: any) => {
        expect(app.price).toBeGreaterThan(0);
      });
    });

    it('should search apps by name', async () => {
      const response = await request(app)
        .get('/api/apps?search=Productivity')
        .expect(200);

      response.body.apps.forEach((app: any) => {
        expect(app.name.toLowerCase()).toContain('productivity');
      });
    });

    it('should sort apps by name', async () => {
      const response = await request(app)
        .get('/api/apps?sortBy=name&sortOrder=asc')
        .expect(200);

      const names = response.body.apps.map((app: any) => app.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });

    it('should sort apps by price', async () => {
      const response = await request(app)
        .get('/api/apps?sortBy=price&sortOrder=desc')
        .expect(200);

      const prices = response.body.apps.map((app: any) => app.price);
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeLessThanOrEqual(prices[i - 1]);
      }
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/apps?page=1&limit=2')
        .expect(200);

      expect(response.body.apps.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 2);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('pages');
    });
  });

  describe('GET /api/apps/:id', () => {
    it('should get app details', async () => {
      const response = await request(app)
        .get(`/api/apps/${testApp.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testApp.id);
      expect(response.body).toHaveProperty('name', testApp.name);
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('developer');
      expect(response.body.developer).toHaveProperty('name');
    });

    it('should increment view count', async () => {
      const initialViews = testApp.views || 0;

      await request(app)
        .get(`/api/apps/${testApp.id}`)
        .expect(200);

      const updatedApp = await prisma.app.findUnique({
        where: { id: testApp.id },
      });

      expect(updatedApp?.views).toBe(initialViews + 1);
    });

    it('should return 404 for non-existent app', async () => {
      const response = await request(app)
        .get('/api/apps/non-existent-id')
        .expect(404);

      expect(response.body.error).toBe('App not found');
    });

    it('should not return pending apps to regular users', async () => {
      const pendingApp = await testUtils.createTestApp(developer.id, {
        status: 'PENDING',
      });

      const response = await request(app)
        .get(`/api/apps/${pendingApp.id}`)
        .expect(404);

      expect(response.body.error).toBe('App not found');
    });

    it('should return pending apps to developers (own apps)', async () => {
      const pendingApp = await testUtils.createTestApp(developer.id, {
        status: 'PENDING',
      });

      const response = await request(app)
        .get(`/api/apps/${pendingApp.id}`)
        .set('Authorization', `Bearer ${developerToken}`)
        .expect(200);

      expect(response.body.id).toBe(pendingApp.id);
    });

    it('should return pending apps to admins', async () => {
      const pendingApp = await testUtils.createTestApp(developer.id, {
        status: 'PENDING',
      });

      const response = await request(app)
        .get(`/api/apps/${pendingApp.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.id).toBe(pendingApp.id);
    });
  });

  describe('POST /api/apps', () => {
    const validAppData = {
      name: 'New Test App',
      description: 'A new test application',
      category: 'PRODUCTIVITY',
      platform: 'ANDROID',
      version: '1.0.0',
      packageName: 'com.test.newapp',
      downloadUrl: 'https://example.com/newapp.apk',
      iconUrl: 'https://example.com/newapp-icon.png',
      screenshots: ['https://example.com/screenshot1.png'],
      price: 999,
      tags: ['productivity', 'utility'],
    };

    it('should create app as developer', async () => {
      const response = await request(app)
        .post('/api/apps')
        .set('Authorization', `Bearer ${developerToken}`)
        .send(validAppData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(validAppData.name);
      expect(response.body.developerId).toBe(developer.id);
      expect(response.body.status).toBe('PENDING');
    });

    it('should not create app without authentication', async () => {
      const response = await request(app)
        .post('/api/apps')
        .send(validAppData)
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided');
    });

    it('should not create app as regular user', async () => {
      const response = await request(app)
        .post('/api/apps')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validAppData)
        .expect(403);

      expect(response.body.error).toBe('Access denied. Developer role required');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/apps')
        .set('Authorization', `Bearer ${developerToken}`)
        .send({})
        .expect(400);

      expect(response.body.errors).toContain('Name is required');
      expect(response.body.errors).toContain('Description is required');
      expect(response.body.errors).toContain('Category is required');
    });

    it('should validate unique package name', async () => {
      const response = await request(app)
        .post('/api/apps')
        .set('Authorization', `Bearer ${developerToken}`)
        .send({
          ...validAppData,
          packageName: testApp.packageName,
        })
        .expect(400);

      expect(response.body.error).toContain('Package name already exists');
    });

    it('should validate category enum', async () => {
      const response = await request(app)
        .post('/api/apps')
        .set('Authorization', `Bearer ${developerToken}`)
        .send({
          ...validAppData,
          category: 'INVALID_CATEGORY',
        })
        .expect(400);

      expect(response.body.errors).toContain('Invalid category');
    });

    it('should validate platform enum', async () => {
      const response = await request(app)
        .post('/api/apps')
        .set('Authorization', `Bearer ${developerToken}`)
        .send({
          ...validAppData,
          platform: 'INVALID_PLATFORM',
        })
        .expect(400);

      expect(response.body.errors).toContain('Invalid platform');
    });

    it('should validate price is non-negative', async () => {
      const response = await request(app)
        .post('/api/apps')
        .set('Authorization', `Bearer ${developerToken}`)
        .send({
          ...validAppData,
          price: -100,
        })
        .expect(400);

      expect(response.body.errors).toContain('Price must be non-negative');
    });
  });

  describe('PUT /api/apps/:id', () => {
    const updateData = {
      name: 'Updated App Name',
      description: 'Updated description',
      price: 1999,
    };

    it('should update own app as developer', async () => {
      const response = await request(app)
        .put(`/api/apps/${testApp.id}`)
        .set('Authorization', `Bearer ${developerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.description).toBe(updateData.description);
      expect(response.body.price).toBe(updateData.price);
    });

    it('should not update other developer\'s app', async () => {
      const otherDeveloper = await testUtils.createTestDeveloper();
      const otherDeveloperToken = testUtils.generateJWT(otherDeveloper.id, 'DEVELOPER');

      const response = await request(app)
        .put(`/api/apps/${testApp.id}`)
        .set('Authorization', `Bearer ${otherDeveloperToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.error).toBe('Access denied. You can only update your own apps');
    });

    it('should update any app as admin', async () => {
      const response = await request(app)
        .put(`/api/apps/${testApp.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
    });

    it('should not update without authentication', async () => {
      const response = await request(app)
        .put(`/api/apps/${testApp.id}`)
        .send(updateData)
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided');
    });

    it('should not update as regular user', async () => {
      const response = await request(app)
        .put(`/api/apps/${testApp.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.error).toBe('Access denied. Developer role required');
    });

    it('should return 404 for non-existent app', async () => {
      const response = await request(app)
        .put('/api/apps/non-existent-id')
        .set('Authorization', `Bearer ${developerToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.error).toBe('App not found');
    });

    it('should validate unique package name on update', async () => {
      const otherApp = await testUtils.createTestApp(developer.id, {
        packageName: 'com.other.app',
      });

      const response = await request(app)
        .put(`/api/apps/${testApp.id}`)
        .set('Authorization', `Bearer ${developerToken}`)
        .send({
          packageName: otherApp.packageName,
        })
        .expect(400);

      expect(response.body.error).toContain('Package name already exists');
    });
  });

  describe('DELETE /api/apps/:id', () => {
    it('should delete own app as developer', async () => {
      const response = await request(app)
        .delete(`/api/apps/${testApp.id}`)
        .set('Authorization', `Bearer ${developerToken}`)
        .expect(200);

      expect(response.body.message).toBe('App deleted successfully');

      // Verify app was deleted
      const deletedApp = await prisma.app.findUnique({
        where: { id: testApp.id },
      });
      expect(deletedApp).toBeNull();
    });

    it('should not delete other developer\'s app', async () => {
      const otherDeveloper = await testUtils.createTestDeveloper();
      const otherDeveloperToken = testUtils.generateJWT(otherDeveloper.id, 'DEVELOPER');

      const response = await request(app)
        .delete(`/api/apps/${testApp.id}`)
        .set('Authorization', `Bearer ${otherDeveloperToken}`)
        .expect(403);

      expect(response.body.error).toBe('Access denied. You can only delete your own apps');
    });

    it('should delete any app as admin', async () => {
      const response = await request(app)
        .delete(`/api/apps/${testApp.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toBe('App deleted successfully');
    });

    it('should not delete without authentication', async () => {
      const response = await request(app)
        .delete(`/api/apps/${testApp.id}`)
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided');
    });

    it('should return 404 for non-existent app', async () => {
      const response = await request(app)
        .delete('/api/apps/non-existent-id')
        .set('Authorization', `Bearer ${developerToken}`)
        .expect(404);

      expect(response.body.error).toBe('App not found');
    });
  });

  describe('POST /api/apps/:id/download', () => {
    it('should track app download', async () => {
      const initialDownloads = testApp.downloads || 0;

      const response = await request(app)
        .post(`/api/apps/${testApp.id}/download`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.downloadUrl).toBe(testApp.downloadUrl);

      // Verify download count was incremented
      const updatedApp = await prisma.app.findUnique({
        where: { id: testApp.id },
      });
      expect(updatedApp?.downloads).toBe(initialDownloads + 1);

      // Verify download record was created
      const downloadRecord = await prisma.download.findFirst({
        where: {
          appId: testApp.id,
          userId: user.id,
        },
      });
      expect(downloadRecord).toBeTruthy();
    });

    it('should allow download without authentication', async () => {
      const response = await request(app)
        .post(`/api/apps/${testApp.id}/download`)
        .expect(200);

      expect(response.body.downloadUrl).toBe(testApp.downloadUrl);
    });

    it('should return 404 for non-existent app', async () => {
      const response = await request(app)
        .post('/api/apps/non-existent-id/download')
        .expect(404);

      expect(response.body.error).toBe('App not found');
    });

    it('should not allow download of pending apps', async () => {
      const pendingApp = await testUtils.createTestApp(developer.id, {
        status: 'PENDING',
      });

      const response = await request(app)
        .post(`/api/apps/${pendingApp.id}/download`)
        .expect(404);

      expect(response.body.error).toBe('App not found');
    });
  });

  describe('GET /api/apps/categories', () => {
    it('should get all categories', async () => {
      const response = await request(app)
        .get('/api/apps/categories')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      
      response.body.forEach((category: any) => {
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('description');
        expect(category).toHaveProperty('iconUrl');
        expect(category).toHaveProperty('_count');
      });
    });
  });

  describe('GET /api/apps/featured', () => {
    beforeEach(async () => {
      // Create featured apps
      await testUtils.createTestApp(developer.id, {
        name: 'Featured App 1',
        isFeatured: true,
        status: 'APPROVED',
      });
      
      await testUtils.createTestApp(developer.id, {
        name: 'Featured App 2',
        isFeatured: true,
        status: 'APPROVED',
      });
    });

    it('should get featured apps', async () => {
      const response = await request(app)
        .get('/api/apps/featured')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      
      response.body.forEach((app: any) => {
        expect(app.isFeatured).toBe(true);
        expect(app.status).toBe('APPROVED');
      });
    });
  });

  describe('GET /api/apps/trending', () => {
    it('should get trending apps', async () => {
      const response = await request(app)
        .get('/api/apps/trending')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeLessThanOrEqual(10);
      
      response.body.forEach((app: any) => {
        expect(app.status).toBe('APPROVED');
      });
    });
  });

  describe('GET /api/apps/recommendations', () => {
    it('should get personalized recommendations for authenticated user', async () => {
      const response = await request(app)
        .get('/api/apps/recommendations')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      
      response.body.forEach((app: any) => {
        expect(app.status).toBe('APPROVED');
      });
    });

    it('should get general recommendations for unauthenticated user', async () => {
      const response = await request(app)
        .get('/api/apps/recommendations')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });
  });
});