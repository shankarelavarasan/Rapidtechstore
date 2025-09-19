import request from 'supertest';
import { app } from '../src/index';
import { prisma } from './setup';
import bcrypt from 'bcryptjs';

describe('Authentication', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'USER',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.name).toBe(userData.name);
      expect(response.body.user.role).toBe(userData.role);
      expect(response.body.user).not.toHaveProperty('password');

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: userData.email },
      });
      expect(user).toBeTruthy();
      expect(user?.email).toBe(userData.email);
    });

    it('should hash the password correctly', async () => {
      const userData = {
        email: 'test2@example.com',
        password: 'password123',
        name: 'Test User 2',
        role: 'USER',
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      const user = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      expect(user?.password).not.toBe(userData.password);
      expect(await bcrypt.compare(userData.password, user?.password || '')).toBe(true);
    });

    it('should not register user with duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'USER',
      };

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toContain('Email is required');
      expect(response.body.errors).toContain('Password is required');
      expect(response.body.errors).toContain('Name is required');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User',
          role: 'USER',
        })
        .expect(400);

      expect(response.body.errors).toContain('Please provide a valid email');
    });

    it('should validate password strength', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: '123',
          name: 'Test User',
          role: 'USER',
        })
        .expect(400);

      expect(response.body.errors).toContain('Password must be at least 6 characters long');
    });

    it('should validate role enum', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
          role: 'INVALID_ROLE',
        })
        .expect(400);

      expect(response.body.errors).toContain('Role must be one of: USER, DEVELOPER, ADMIN');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create test user
      const hashedPassword = await bcrypt.hash('password123', 12);
      await prisma.user.create({
        data: {
          email: 'login@example.com',
          password: hashedPassword,
          name: 'Login User',
          role: 'USER',
          isEmailVerified: true,
        },
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('login@example.com');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should not login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should not login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should not login with unverified email', async () => {
      // Create unverified user
      const hashedPassword = await bcrypt.hash('password123', 12);
      await prisma.user.create({
        data: {
          email: 'unverified@example.com',
          password: hashedPassword,
          name: 'Unverified User',
          role: 'USER',
          isEmailVerified: false,
        },
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unverified@example.com',
          password: 'password123',
        })
        .expect(401);

      expect(response.body.error).toBe('Please verify your email before logging in');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body.errors).toContain('Email is required');
      expect(response.body.errors).toContain('Password is required');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let user: any;
    let refreshToken: string;

    beforeEach(async () => {
      user = await testUtils.createTestUser();
      
      // Create refresh token
      const jwt = require('jsonwebtoken');
      refreshToken = jwt.sign(
        { userId: user.id, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    });

    it('should refresh token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should not refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.error).toBe('Invalid refresh token');
    });

    it('should not refresh with expired token', async () => {
      // Create expired token
      const expiredToken = require('jsonwebtoken').sign(
        { userId: user.id, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '-1d' }
      );

      await prisma.refreshToken.create({
        data: {
          token: expiredToken,
          userId: user.id,
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: expiredToken })
        .expect(401);

      expect(response.body.error).toBe('Refresh token expired');
    });
  });

  describe('POST /api/auth/logout', () => {
    let user: any;
    let token: string;
    let refreshToken: string;

    beforeEach(async () => {
      user = await testUtils.createTestUser();
      token = testUtils.generateJWT(user.id, user.role);
      
      const jwt = require('jsonwebtoken');
      refreshToken = jwt.sign(
        { userId: user.id, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send({ refreshToken })
        .expect(200);

      expect(response.body.message).toBe('Logged out successfully');

      // Verify refresh token was deleted
      const deletedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });
      expect(deletedToken).toBeNull();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken })
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    let user: any;

    beforeEach(async () => {
      user = await testUtils.createTestUser({
        email: 'forgot@example.com',
      });
    });

    it('should send password reset email for valid email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'forgot@example.com' })
        .expect(200);

      expect(response.body.message).toBe('Password reset email sent');

      // Verify reset token was created
      const resetToken = await prisma.passwordResetToken.findFirst({
        where: { userId: user.id },
      });
      expect(resetToken).toBeTruthy();
    });

    it('should return success even for non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.message).toBe('Password reset email sent');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.errors).toContain('Please provide a valid email');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    let user: any;
    let resetToken: string;

    beforeEach(async () => {
      user = await testUtils.createTestUser();
      
      // Create reset token
      const crypto = require('crypto');
      resetToken = crypto.randomBytes(32).toString('hex');
      
      await prisma.passwordResetToken.create({
        data: {
          token: resetToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });
    });

    it('should reset password with valid token', async () => {
      const newPassword = 'newpassword123';
      
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: newPassword,
        })
        .expect(200);

      expect(response.body.message).toBe('Password reset successfully');

      // Verify password was changed
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(await bcrypt.compare(newPassword, updatedUser?.password || '')).toBe(true);

      // Verify reset token was deleted
      const deletedToken = await prisma.passwordResetToken.findUnique({
        where: { token: resetToken },
      });
      expect(deletedToken).toBeNull();
    });

    it('should not reset with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'newpassword123',
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid or expired reset token');
    });

    it('should not reset with expired token', async () => {
      // Create expired token
      const expiredToken = require('crypto').randomBytes(32).toString('hex');
      await prisma.passwordResetToken.create({
        data: {
          token: expiredToken,
          userId: user.id,
          expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        },
      });

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: expiredToken,
          password: 'newpassword123',
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid or expired reset token');
    });

    it('should validate password strength', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: '123',
        })
        .expect(400);

      expect(response.body.errors).toContain('Password must be at least 6 characters long');
    });
  });

  describe('GET /api/auth/verify-email/:token', () => {
    let user: any;
    let verificationToken: string;

    beforeEach(async () => {
      const crypto = require('crypto');
      verificationToken = crypto.randomBytes(32).toString('hex');
      
      user = await testUtils.createTestUser({
        isEmailVerified: false,
        emailVerificationToken: verificationToken,
      });
    });

    it('should verify email with valid token', async () => {
      const response = await request(app)
        .get(`/api/auth/verify-email/${verificationToken}`)
        .expect(200);

      expect(response.body.message).toBe('Email verified successfully');

      // Verify user email was verified
      const verifiedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(verifiedUser?.isEmailVerified).toBe(true);
      expect(verifiedUser?.emailVerificationToken).toBeNull();
    });

    it('should not verify with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify-email/invalid-token')
        .expect(400);

      expect(response.body.error).toBe('Invalid verification token');
    });

    it('should not verify already verified email', async () => {
      // Verify the user first
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isEmailVerified: true,
          emailVerificationToken: null,
        },
      });

      const response = await request(app)
        .get(`/api/auth/verify-email/${verificationToken}`)
        .expect(400);

      expect(response.body.error).toBe('Invalid verification token');
    });
  });

  describe('POST /api/auth/resend-verification', () => {
    let user: any;

    beforeEach(async () => {
      user = await testUtils.createTestUser({
        email: 'unverified@example.com',
        isEmailVerified: false,
      });
    });

    it('should resend verification email for unverified user', async () => {
      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'unverified@example.com' })
        .expect(200);

      expect(response.body.message).toBe('Verification email sent');

      // Verify new verification token was created
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(updatedUser?.emailVerificationToken).toBeTruthy();
    });

    it('should not resend for already verified user', async () => {
      await prisma.user.update({
        where: { id: user.id },
        data: { isEmailVerified: true },
      });

      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'unverified@example.com' })
        .expect(400);

      expect(response.body.error).toBe('Email is already verified');
    });

    it('should return success for non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.message).toBe('Verification email sent');
    });
  });
});