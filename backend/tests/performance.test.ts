import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../src/index';
import { createTestUser, createTestDeveloper, createTestApp, generateJWT } from './setup';

const prisma = new PrismaClient();

describe('Performance Tests', () => {
  let userToken: string;
  let developerToken: string;
  let testApps: any[] = [];

  beforeAll(async () => {
    const testUser = await createTestUser();
    const testDeveloper = await createTestDeveloper();
    
    userToken = generateJWT(testUser.id);
    developerToken = generateJWT(testDeveloper.id);

    // Create multiple test apps for performance testing
    for (let i = 0; i < 10; i++) {
      const app = await createTestApp(testDeveloper.id, {
        name: `Performance Test App ${i}`,
        description: `Test app ${i} for performance testing`,
        price: Math.random() * 50,
      });
      testApps.push(app);
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('API Response Times', () => {
    it('should respond to app listing within 500ms', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/apps')
        .query({ limit: 20 });

      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(500);
    });

    it('should respond to app search within 300ms', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/apps/search')
        .query({ q: 'test', limit: 10 });

      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(300);
    });

    it('should respond to user authentication within 200ms', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(200);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle 50 concurrent app listing requests', async () => {
      const requests = Array(50).fill(null).map(() =>
        request(app)
          .get('/api/apps')
          .query({ limit: 10 })
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within 2 seconds
      expect(totalTime).toBeLessThan(2000);
    });

    it('should handle concurrent user registrations', async () => {
      const requests = Array(20).fill(null).map((_, index) =>
        request(app)
          .post('/api/auth/register')
          .send({
            email: `concurrent${index}@example.com`,
            password: 'SecurePass123!',
            name: `Concurrent User ${index}`,
          })
      );

      const responses = await Promise.all(requests);

      // All registrations should succeed
      responses.forEach(response => {
        expect([201, 409]).toContain(response.status); // 201 success, 409 if email exists
      });
    });

    it('should handle concurrent app downloads', async () => {
      const testApp = testApps[0];
      
      const requests = Array(30).fill(null).map(() =>
        request(app)
          .post(`/api/apps/${testApp.id}/download`)
          .set('Authorization', `Bearer ${userToken}`)
      );

      const responses = await Promise.all(requests);

      // Most requests should succeed (some might fail due to rate limiting)
      const successfulRequests = responses.filter(r => r.status === 200);
      expect(successfulRequests.length).toBeGreaterThan(20);
    });
  });

  describe('Database Performance', () => {
    it('should efficiently query apps with filters', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/apps')
        .query({
          category: 'PRODUCTIVITY',
          minPrice: 0,
          maxPrice: 50,
          sortBy: 'downloads',
          order: 'desc',
          limit: 20,
        });

      const queryTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(queryTime).toBeLessThan(300);
    });

    it('should efficiently handle pagination', async () => {
      const requests = [];
      
      // Test multiple pages
      for (let page = 1; page <= 5; page++) {
        requests.push(
          request(app)
            .get('/api/apps')
            .query({ page, limit: 10 })
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(totalTime).toBeLessThan(1000);
    });

    it('should efficiently handle complex analytics queries', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/developers/analytics')
        .set('Authorization', `Bearer ${developerToken}`)
        .query({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          groupBy: 'day',
        });

      const queryTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(queryTime).toBeLessThan(500);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not leak memory during repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform 100 operations
      for (let i = 0; i < 100; i++) {
        await request(app)
          .get('/api/apps')
          .query({ limit: 5 });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle large response payloads efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/apps')
        .query({ limit: 100 }); // Large response

      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000);
      expect(response.body.apps.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should efficiently enforce rate limits', async () => {
      const requests = Array(15).fill(null).map(() =>
        request(app)
          .get('/api/apps')
          .set('Authorization', `Bearer ${userToken}`)
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // Should complete quickly even with rate limiting
      expect(totalTime).toBeLessThan(1000);

      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Search Performance', () => {
    it('should perform text search efficiently', async () => {
      const searchTerms = ['test', 'app', 'productivity', 'game', 'tool'];
      
      const requests = searchTerms.map(term =>
        request(app)
          .get('/api/apps/search')
          .query({ q: term, limit: 20 })
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // All searches should complete within 1 second
      expect(totalTime).toBeLessThan(1000);
    });

    it('should handle fuzzy search efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/apps/search')
        .query({ 
          q: 'productivty', // Intentional typo
          fuzzy: true,
          limit: 10 
        });

      const searchTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(searchTime).toBeLessThan(400);
    });
  });

  describe('File Upload Performance', () => {
    it('should handle app icon uploads efficiently', async () => {
      const testApp = testApps[0];
      const mockImageData = Buffer.from('fake-image-data').toString('base64');
      
      const startTime = Date.now();
      
      const response = await request(app)
        .patch(`/api/apps/${testApp.id}`)
        .set('Authorization', `Bearer ${developerToken}`)
        .send({
          iconUrl: `data:image/png;base64,${mockImageData}`,
        });

      const uploadTime = Date.now() - startTime;
      
      expect(uploadTime).toBeLessThan(1000);
    });
  });

  describe('Cache Performance', () => {
    it('should serve cached responses faster', async () => {
      // First request (cache miss)
      const startTime1 = Date.now();
      const response1 = await request(app)
        .get('/api/apps/featured');
      const firstRequestTime = Date.now() - startTime1;

      expect(response1.status).toBe(200);

      // Second request (cache hit)
      const startTime2 = Date.now();
      const response2 = await request(app)
        .get('/api/apps/featured');
      const secondRequestTime = Date.now() - startTime2;

      expect(response2.status).toBe(200);
      
      // Cached response should be faster
      expect(secondRequestTime).toBeLessThan(firstRequestTime);
      expect(secondRequestTime).toBeLessThan(100);
    });
  });
});