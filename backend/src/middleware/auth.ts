import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { createAppError } from './errorHandler';

const prisma = new PrismaClient();

interface JWTPayload {
  id: string;
  email: string;
  type: 'developer' | 'user' | 'admin';
}

interface AuthenticatedRequest extends Request {
  developer?: {
    id: string;
    email: string;
  };
  user?: {
    id: string;
    email: string;
  };
  admin?: {
    id: string;
    email: string;
    role: string;
  };
}

// Authenticate developer
export const authenticateDeveloper = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return next(createAppError('Access token is required', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key') as JWTPayload;
    
    if (decoded.type !== 'developer') {
      return next(createAppError('Invalid token type', 401));
    }

    const developer = await prisma.developer.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        isActive: true,
        verificationStatus: true,
      },
    });

    if (!developer) {
      return next(createAppError('Developer not found', 401));
    }

    if (!developer.isActive) {
      return next(createAppError('Account is deactivated', 401));
    }

    req.developer = {
      id: developer.id,
      email: developer.email,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(createAppError('Invalid token', 401));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(createAppError('Token expired', 401));
    }
    next(error);
  }
};

// Authenticate user
export const authenticateUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return next(createAppError('Access token is required', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key') as JWTPayload;
    
    if (decoded.type !== 'user') {
      return next(createAppError('Invalid token type', 401));
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
      },
    });

    if (!user) {
      return next(createAppError('User not found', 401));
    }

    req.user = {
      id: user.id,
      email: user.email,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(createAppError('Invalid token', 401));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(createAppError('Token expired', 401));
    }
    next(error);
  }
};

// Generic token authentication (for any user type)
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return next(createAppError('Access token is required', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key') as JWTPayload;
    
    // Check based on token type
    if (decoded.type === 'user') {
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          isEmailVerified: true,
        },
      });

      if (!user) {
        return next(createAppError('User not found', 401));
      }

      req.user = {
        id: user.id,
        email: user.email,
      };
    } else if (decoded.type === 'developer') {
      const developer = await prisma.developer.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          isActive: true,
          verificationStatus: true,
        },
      });

      if (!developer) {
        return next(createAppError('Developer not found', 401));
      }

      if (!developer.isActive) {
        return next(createAppError('Account is deactivated', 401));
      }

      req.developer = {
        id: developer.id,
        email: developer.email,
      };
    } else if (decoded.type === 'admin') {
      const admin = await prisma.admin.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
        },
      });

      if (!admin) {
        return next(createAppError('Admin not found', 401));
      }

      if (!admin.isActive) {
        return next(createAppError('Account is deactivated', 401));
      }

      req.admin = {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      };
    } else {
      return next(createAppError('Invalid token type', 401));
    }

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(createAppError('Invalid token', 401));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(createAppError('Token expired', 401));
    }
    next(error);
  }
};

// Authenticate admin
export const authenticateAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return next(createAppError('Access token is required', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key') as JWTPayload;
    
    if (decoded.type !== 'admin') {
      return next(createAppError('Invalid token type', 401));
    }

    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!admin) {
      return next(createAppError('Admin not found', 401));
    }

    if (!admin.isActive) {
      return next(createAppError('Account is deactivated', 401));
    }

    req.admin = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(createAppError('Invalid token', 401));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(createAppError('Token expired', 401));
    }
    next(error);
  }
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key') as JWTPayload;
    
    if (decoded.type === 'user') {
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true },
      });
      
      if (user) {
        req.user = user;
      }
    } else if (decoded.type === 'developer') {
      const developer = await prisma.developer.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true },
      });
      
      if (developer) {
        req.developer = developer;
      }
    }

    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
};

// Check if developer is approved
export const requireApprovedDeveloper = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // This middleware should be used after authenticateDeveloper
  if (!req.developer) {
    return next(createAppError('Developer authentication required', 401));
  }

  // Check developer status in database
  prisma.developer.findUnique({
    where: { id: req.developer.id },
    select: { verificationStatus: true },
  }).then(developer => {
    if (!developer) {
      return next(createAppError('Developer not found', 404));
    }

    if (developer.verificationStatus !== 'APPROVED') {
      return next(createAppError('Developer account not approved', 403));
    }

    next();
  }).catch(next);
};

// Check admin permissions
export const requireAdminRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return next(createAppError('Admin authentication required', 401));
    }

    if (!roles.includes(req.admin.role)) {
      return next(createAppError('Insufficient permissions', 403));
    }

    next();
  };
};

// Helper function to extract token from request
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Also check for token in cookies
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  
  return null;
}

// Generate JWT token
export const generateToken = (payload: JWTPayload): string => {
  const secret = process.env.JWT_SECRET || 'fallback-secret-key';
  return jwt.sign(payload, secret);
};

// Verify JWT token
export const verifyToken = (token: string): JWTPayload => {
  const secret = process.env.JWT_SECRET || 'fallback-secret-key';
  return jwt.verify(token, secret) as JWTPayload;
};

// Export the interface for use in other files
export type { AuthenticatedRequest };