import { authApi } from '../lib/api';
import { User } from '../types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
  error?: string;
}

export class AuthService {
  /**
   * Login user with email and password
   */
  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await authApi.login(credentials);
      
      if (response.data.success) {
        return {
          success: true,
          message: response.data.message,
          user: response.data.user,
          token: response.data.token,
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Login failed',
          error: response.data.error,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: 'Login failed',
        error: error.response?.data?.message || error.message || 'Network error',
      };
    }
  }

  /**
   * Register new user
   */
  static async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await authApi.register(userData);
      
      if (response.data.success) {
        return {
          success: true,
          message: response.data.message,
          user: response.data.user,
          token: response.data.token,
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Registration failed',
          error: response.data.error,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: 'Registration failed',
        error: error.response?.data?.message || error.message || 'Network error',
      };
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    try {
      await authApi.logout();
    } catch (error) {
      // Even if logout fails on server, we'll clear local storage
      console.warn('Logout API call failed:', error);
    } finally {
      // Always clear local storage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
  }

  /**
   * Refresh authentication token
   */
  static async refreshToken(): Promise<AuthResponse> {
    try {
      const response = await authApi.refresh();
      
      if (response.data.success) {
        return {
          success: true,
          message: 'Token refreshed',
          token: response.data.token,
        };
      } else {
        return {
          success: false,
          message: 'Token refresh failed',
          error: response.data.error,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: 'Token refresh failed',
        error: error.response?.data?.message || error.message || 'Network error',
      };
    }
  }

  /**
   * Request password reset
   */
  static async forgotPassword(email: string): Promise<AuthResponse> {
    try {
      const response = await authApi.forgotPassword(email);
      
      return {
        success: response.data.success,
        message: response.data.message,
        error: response.data.error,
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Password reset request failed',
        error: error.response?.data?.message || error.message || 'Network error',
      };
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, password: string): Promise<AuthResponse> {
    try {
      const response = await authApi.resetPassword(token, password);
      
      return {
        success: response.data.success,
        message: response.data.message,
        error: response.data.error,
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Password reset failed',
        error: error.response?.data?.message || error.message || 'Network error',
      };
    }
  }

  /**
   * Verify email with token
   */
  static async verifyEmail(token: string): Promise<AuthResponse> {
    try {
      const response = await authApi.verifyEmail(token);
      
      return {
        success: response.data.success,
        message: response.data.message,
        error: response.data.error,
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Email verification failed',
        error: error.response?.data?.message || error.message || 'Network error',
      };
    }
  }

  /**
   * Get user profile
   */
  static async getProfile(): Promise<AuthResponse> {
    try {
      const response = await authApi.getProfile();
      
      if (response.data.success) {
        return {
          success: true,
          message: 'Profile retrieved',
          user: response.data.user,
        };
      } else {
        return {
          success: false,
          message: 'Failed to get profile',
          error: response.data.error,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to get profile',
        error: error.response?.data?.message || error.message || 'Network error',
      };
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(data: Partial<User>): Promise<AuthResponse> {
    try {
      const response = await authApi.updateProfile(data);
      
      if (response.data.success) {
        return {
          success: true,
          message: response.data.message,
          user: response.data.user,
        };
      } else {
        return {
          success: false,
          message: 'Profile update failed',
          error: response.data.error,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: 'Profile update failed',
        error: error.response?.data?.message || error.message || 'Network error',
      };
    }
  }

  /**
   * Check if user is authenticated by validating token
   */
  static async validateToken(): Promise<boolean> {
    const token = localStorage.getItem('auth_token');
    if (!token) return false;

    try {
      const response = await this.getProfile();
      return response.success;
    } catch (error) {
      return false;
    }
  }
}