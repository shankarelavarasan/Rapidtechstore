import express, { Response } from 'express';
import { body } from 'express-validator';
import { registerUser, loginUser, getUserProfile, updateUserProfile } from '../controllers/userController';
import { authenticateUser } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';

interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
    email: string;
  };
}

const router = express.Router();

// POST /api/auth/register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name').trim().isLength({ min: 1 }),
  validateRequest,
], registerUser);

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists(),
  validateRequest,
], loginUser);

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// GET /api/auth/profile
router.get('/profile', authenticateUser, getUserProfile);

// PUT /api/auth/profile
router.put('/profile', [
  authenticateUser,
  body('name').optional().trim().isLength({ min: 1 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('country').optional().trim(),
  validateRequest,
], updateUserProfile);

// POST /api/auth/validate
router.post('/validate', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    message: 'Token is valid',
    data: { user: req.user }
  });
});

export default router;