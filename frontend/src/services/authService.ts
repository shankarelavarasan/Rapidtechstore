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
      const apiResponse = response.data as any;
      
      if (apiResponse?.success) {
        return {
          success: true,
          message: apiResponse.message || 'Login successful',
          user: apiResponse.user,
          token: apiResponse.token,
        };
      } else {
        return {
          success: false,
          message: apiResponse?.message || 'Login failed',
          error: apiResponse?.error,
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
      const apiResponse = response.data as any;
      
      if (apiResponse?.success) {
        return {
          success: true,
          message: apiResponse.message || 'Registration successful',
          user: apiResponse.user,
          token: apiResponse.token,
        };
      } else {
        return {
          success: false,
          message: apiResponse?.message || 'Registration failed',
          error: apiResponse?.error,
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
      const response = await authApi.refreshToken();
      const apiResponse = response.data as any;
      
      if (apiResponse?.success) {
        return {
          success: true,
          message: 'Token refreshed',
          token: apiResponse.token,
        };
      } else {
        return {
          success: false,
          message: 'Token refresh failed',
          error: apiResponse?.error,
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
      const apiResponse = response.data as any;
      
      return {
        success: apiResponse?.success || false,
        message: apiResponse?.message || 'Password reset email sent',
        error: apiResponse?.error,
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
      const apiResponse = response.data as any;
      
      return {
        success: apiResponse.success || false,
        message: apiResponse.message || 'Password reset successful',
        error: apiResponse.error,
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
      const apiResponse = response.data as any;
      
      return {
        success: apiResponse.success || false,
        message: apiResponse.message || 'Email verified successfully',
        error: apiResponse.error,
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
      const apiResponse = response.data as any;
      
      if (apiResponse.success) {
        return {
          success: true,
          message: 'Profile retrieved',
          user: apiResponse.data || apiResponse.user,
        };
      } else {
        return {
          success: false,
          message: 'Failed to get profile',
          error: apiResponse.error || apiResponse.message,
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
      
      const apiResponse = response.data as any;
      if (apiResponse.success) {
        return {
          success: true,
          message: apiResponse.message || 'Profile updated successfully',
          user: apiResponse.data || apiResponse.user,
        };
      } else {
        return {
          success: false,
          message: 'Profile update failed',
          error: apiResponse.error || apiResponse.message,
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