import request from 'supertest';
import { app } from '../src/index';
import { prisma } from './setup';

describe('Review System', () => {
  let user: any;
  let otherUser: any;
  let developer: any;
  let admin: any;
  let userToken: string;
  let otherUserToken: string;
  let developerToken: string;
  let adminToken: string;
  let testApp: any;
  let testReview: any;

  beforeEach(async () => {
    // Create test users
    user = await testUtils.createTestUser();
    otherUser = await testUtils.createTestUser();
    developer = await testUtils.createTestDeveloper();
    admin = await testUtils.createTestAdmin();

    // Generate tokens
    userToken = testUtils.generateJWT(user.id, user.role);
    otherUserToken = testUtils.generateJWT(otherUser.id, otherUser.role);
    developerToken = testUtils.generateJWT(developer.id, developer.role);
    adminToken = testUtils.generateJWT(admin.id, admin.role);

    // Create test app
    testApp = await testUtils.createTestApp(developer.id);

    // Create test review
    testReview = await prisma.review.create({
      data: {
        rating: 4,
        comment: 'Great app!',
        userId: user.id,
        appId: testApp.id,
      },
    });
  });

  describe('GET /api/apps/:appId/reviews', () => {
    beforeEach(async () => {
      // Create additional reviews
      await prisma.review.createMany({
        data: [
          {
            rating: 5,
            comment: 'Excellent app!',
            userId: otherUser.id,
            appId: testApp.id,
          },
          {
            rating: 3,
            comment: 'Good but could be better',
            userId: user.id,
            appId: testApp.id,
          },
          {
            rating: 2,
            comment: 'Not great',
            userId: otherUser.id,
            appId: testApp.id,
          },
        ],
      });
    });

    it('should get app reviews', async () => {
      const response = await request(app)
        .get(`/api/apps/${testApp.id}/reviews`)
        .expect(200);

      expect(response.body).toHaveProperty('reviews');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body).toHaveProperty('stats');
      expect(response.body.reviews).toBeInstanceOf(Array);
      
      response.body.reviews.forEach((review: any) => {
        expect(review).toHaveProperty('id');
        expect(review).toHaveProperty('rating');
        expect(review).toHaveProperty('comment');
        expect(review).toHaveProperty('user');
        expect(review).toHaveProperty('createdAt');
        expect(review.appId).toBe(testApp.id);
      });

      // Check stats
      expect(response.body.stats).toHaveProperty('averageRating');
      expect(response.body.stats).toHaveProperty('totalReviews');
      expect(response.body.stats).toHaveProperty('ratingDistribution');
    });

    it('should sort reviews by newest first by default', async () => {
      const response = await request(app)
        .get(`/api/apps/${testApp.id}/reviews`)
        .expect(200);

      const reviews = response.body.reviews;
      for (let i = 1; i < reviews.length; i++) {
        const current = new Date(reviews[i].createdAt);
        const previous = new Date(reviews[i - 1].createdAt);
        expect(current.getTime()).toBeLessThanOrEqual(previous.getTime());
      }
    });

    it('should sort reviews by rating', async () => {
      const response = await request(app)
        .get(`/api/apps/${testApp.id}/reviews?sortBy=rating&sortOrder=desc`)
        .expect(200);

      const ratings = response.body.reviews.map((review: any) => review.rating);
      for (let i = 1; i < ratings.length; i++) {
        expect(ratings[i]).toBeLessThanOrEqual(ratings[i - 1]);
      }
    });

    it('should filter reviews by rating', async () => {
      const response = await request(app)
        .get(`/api/apps/${testApp.id}/reviews?rating=5`)
        .expect(200);

      response.body.reviews.forEach((review: any) => {
        expect(review.rating).toBe(5);
      });
    });

    it('should paginate reviews', async () => {
      const response = await request(app)
        .get(`/api/apps/${testApp.id}/reviews?page=1&limit=2`)
        .expect(200);

      expect(response.body.reviews.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 2);
    });

    it('should return 404 for non-existent app', async () => {
      const response = await request(app)
        .get('/api/apps/non-existent-id/reviews')
        .expect(404);

      expect(response.body.error).toBe('App not found');
    });
  });

  describe('POST /api/apps/:appId/reviews', () => {
    const validReviewData = {
      rating: 5,
      comment: 'Amazing app! Highly recommended.',
    };

    it('should create review as authenticated user', async () => {
      // Delete existing review to avoid duplicate
      await prisma.review.deleteMany({
        where: {
          userId: otherUser.id,
          appId: testApp.id,
        },
      });

      const response = await request(app)
        .post(`/api/apps/${testApp.id}/reviews`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send(validReviewData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.rating).toBe(validReviewData.rating);
      expect(response.body.comment).toBe(validReviewData.comment);
      expect(response.body.userId).toBe(otherUser.id);
      expect(response.body.appId).toBe(testApp.id);
    });

    it('should not create review without authentication', async () => {
      const response = await request(app)
        .post(`/api/apps/${testApp.id}/reviews`)
        .send(validReviewData)
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided');
    });

    it('should not allow duplicate reviews from same user', async () => {
      const response = await request(app)
        .post(`/api/apps/${testApp.id}/reviews`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(validReviewData)
        .expect(400);

      expect(response.body.error).toBe('You have already reviewed this app');
    });

    it('should not allow developer to review own app', async () => {
      const response = await request(app)
        .post(`/api/apps/${testApp.id}/reviews`)
        .set('Authorization', `Bearer ${developerToken}`)
        .send(validReviewData)
        .expect(403);

      expect(response.body.error).toBe('You cannot review your own app');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post(`/api/apps/${testApp.id}/reviews`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({})
        .expect(400);

      expect(response.body.errors).toContain('Rating is required');
    });

    it('should validate rating range', async () => {
      const response = await request(app)
        .post(`/api/apps/${testApp.id}/reviews`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          rating: 6,
          comment: 'Invalid rating',
        })
        .expect(400);

      expect(response.body.errors).toContain('Rating must be between 1 and 5');
    });

    it('should validate comment length', async () => {
      const longComment = 'a'.repeat(1001);
      
      const response = await request(app)
        .post(`/api/apps/${testApp.id}/reviews`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          rating: 5,
          comment: longComment,
        })
        .expect(400);

      expect(response.body.errors).toContain('Comment must be less than 1000 characters');
    });

    it('should return 404 for non-existent app', async () => {
      const response = await request(app)
        .post('/api/apps/non-existent-id/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validReviewData)
        .expect(404);

      expect(response.body.error).toBe('App not found');
    });

    it('should update app rating after review creation', async () => {
      // Delete existing review to avoid duplicate
      await prisma.review.deleteMany({
        where: {
          userId: otherUser.id,
          appId: testApp.id,
        },
      });

      await request(app)
        .post(`/api/apps/${testApp.id}/reviews`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send(validReviewData)
        .expect(201);

      // Check if app rating was updated
      const updatedApp = await prisma.app.findUnique({
        where: { id: testApp.id },
      });

      expect(updatedApp?.rating).toBeGreaterThan(0);
      expect(updatedApp?.reviewCount).toBeGreaterThan(0);
    });
  });

  describe('PUT /api/reviews/:id', () => {
    const updateData = {
      rating: 3,
      comment: 'Updated review comment',
    };

    it('should update own review', async () => {
      const response = await request(app)
        .put(`/api/reviews/${testReview.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.rating).toBe(updateData.rating);
      expect(response.body.comment).toBe(updateData.comment);
    });

    it('should not update other user\'s review', async () => {
      const response = await request(app)
        .put(`/api/reviews/${testReview.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.error).toBe('Access denied. You can only update your own reviews');
    });

    it('should update any review as admin', async () => {
      const response = await request(app)
        .put(`/api/reviews/${testReview.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.rating).toBe(updateData.rating);
    });

    it('should not update without authentication', async () => {
      const response = await request(app)
        .put(`/api/reviews/${testReview.id}`)
        .send(updateData)
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided');
    });

    it('should return 404 for non-existent review', async () => {
      const response = await request(app)
        .put('/api/reviews/non-existent-id')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.error).toBe('Review not found');
    });

    it('should validate rating range on update', async () => {
      const response = await request(app)
        .put(`/api/reviews/${testReview.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          rating: 0,
        })
        .expect(400);

      expect(response.body.errors).toContain('Rating must be between 1 and 5');
    });

    it('should update app rating after review update', async () => {
      await request(app)
        .put(`/api/reviews/${testReview.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      // Verify app rating was recalculated
      const updatedApp = await prisma.app.findUnique({
        where: { id: testApp.id },
      });

      expect(updatedApp?.rating).toBeDefined();
    });
  });

  describe('DELETE /api/reviews/:id', () => {
    it('should delete own review', async () => {
      const response = await request(app)
        .delete(`/api/reviews/${testReview.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.message).toBe('Review deleted successfully');

      // Verify review was deleted
      const deletedReview = await prisma.review.findUnique({
        where: { id: testReview.id },
      });
      expect(deletedReview).toBeNull();
    });

    it('should not delete other user\'s review', async () => {
      const response = await request(app)
        .delete(`/api/reviews/${testReview.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);

      expect(response.body.error).toBe('Access denied. You can only delete your own reviews');
    });

    it('should delete any review as admin', async () => {
      const response = await request(app)
        .delete(`/api/reviews/${testReview.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toBe('Review deleted successfully');
    });

    it('should not delete without authentication', async () => {
      const response = await request(app)
        .delete(`/api/reviews/${testReview.id}`)
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided');
    });

    it('should return 404 for non-existent review', async () => {
      const response = await request(app)
        .delete('/api/reviews/non-existent-id')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.error).toBe('Review not found');
    });

    it('should update app rating after review deletion', async () => {
      await request(app)
        .delete(`/api/reviews/${testReview.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Verify app rating was recalculated
      const updatedApp = await prisma.app.findUnique({
        where: { id: testApp.id },
      });

      expect(updatedApp?.reviewCount).toBe(0);
    });
  });

  describe('POST /api/reviews/:id/helpful', () => {
    it('should mark review as helpful', async () => {
      const response = await request(app)
        .post(`/api/reviews/${testReview.id}/helpful`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(200);

      expect(response.body.message).toBe('Review marked as helpful');

      // Verify helpful vote was recorded
      const helpfulVote = await prisma.reviewHelpful.findFirst({
        where: {
          reviewId: testReview.id,
          userId: otherUser.id,
        },
      });
      expect(helpfulVote).toBeTruthy();
    });

    it('should not allow duplicate helpful votes', async () => {
      // First vote
      await request(app)
        .post(`/api/reviews/${testReview.id}/helpful`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(200);

      // Second vote should fail
      const response = await request(app)
        .post(`/api/reviews/${testReview.id}/helpful`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(400);

      expect(response.body.error).toBe('You have already marked this review as helpful');
    });

    it('should not allow voting on own review', async () => {
      const response = await request(app)
        .post(`/api/reviews/${testReview.id}/helpful`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body.error).toBe('You cannot vote on your own review');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/reviews/${testReview.id}/helpful`)
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided');
    });

    it('should return 404 for non-existent review', async () => {
      const response = await request(app)
        .post('/api/reviews/non-existent-id/helpful')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.error).toBe('Review not found');
    });
  });

  describe('DELETE /api/reviews/:id/helpful', () => {
    beforeEach(async () => {
      // Create helpful vote
      await prisma.reviewHelpful.create({
        data: {
          reviewId: testReview.id,
          userId: otherUser.id,
        },
      });
    });

    it('should remove helpful vote', async () => {
      const response = await request(app)
        .delete(`/api/reviews/${testReview.id}/helpful`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(200);

      expect(response.body.message).toBe('Helpful vote removed');

      // Verify helpful vote was removed
      const helpfulVote = await prisma.reviewHelpful.findFirst({
        where: {
          reviewId: testReview.id,
          userId: otherUser.id,
        },
      });
      expect(helpfulVote).toBeNull();
    });

    it('should return 404 if no helpful vote exists', async () => {
      const response = await request(app)
        .delete(`/api/reviews/${testReview.id}/helpful`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.error).toBe('Helpful vote not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/api/reviews/${testReview.id}/helpful`)
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided');
    });
  });

  describe('POST /api/reviews/:id/report', () => {
    const reportData = {
      reason: 'SPAM',
      description: 'This review is spam',
    };

    it('should report review', async () => {
      const response = await request(app)
        .post(`/api/reviews/${testReview.id}/report`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send(reportData)
        .expect(200);

      expect(response.body.message).toBe('Review reported successfully');

      // Verify report was created
      const report = await prisma.reviewReport.findFirst({
        where: {
          reviewId: testReview.id,
          userId: otherUser.id,
        },
      });
      expect(report).toBeTruthy();
      expect(report?.reason).toBe(reportData.reason);
    });

    it('should not allow duplicate reports', async () => {
      // First report
      await request(app)
        .post(`/api/reviews/${testReview.id}/report`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send(reportData)
        .expect(200);

      // Second report should fail
      const response = await request(app)
        .post(`/api/reviews/${testReview.id}/report`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send(reportData)
        .expect(400);

      expect(response.body.error).toBe('You have already reported this review');
    });

    it('should not allow reporting own review', async () => {
      const response = await request(app)
        .post(`/api/reviews/${testReview.id}/report`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(reportData)
        .expect(400);

      expect(response.body.error).toBe('You cannot report your own review');
    });

    it('should validate report reason', async () => {
      const response = await request(app)
        .post(`/api/reviews/${testReview.id}/report`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          reason: 'INVALID_REASON',
          description: 'Test',
        })
        .expect(400);

      expect(response.body.errors).toContain('Invalid report reason');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/reviews/${testReview.id}/report`)
        .send(reportData)
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided');
    });
  });
});