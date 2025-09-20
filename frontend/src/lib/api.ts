import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { ApiResponse } from '../types'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth token and redirect to login
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Generic API methods
export const apiClient = {
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    const response = await api.get(url, config)
    return response.data
  },

  post: async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    const response = await api.post(url, data, config)
    return response.data
  },

  put: async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    const response = await api.put(url, data, config)
    return response.data
  },

  patch: async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    const response = await api.patch(url, data, config)
    return response.data
  },

  delete: async <T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    const response = await api.delete(url, config)
    return response.data
  },

  upload: async <T>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    const response = await api.post(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config?.headers,
      },
    })
    return response.data
  },
}

// Auth API
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    apiClient.post('/auth/login', credentials),

  register: (userData: { email: string; username: string; password: string; firstName?: string; lastName?: string }) =>
    apiClient.post('/auth/register', userData),

  logout: () =>
    apiClient.post('/auth/logout'),

  refreshToken: () =>
    apiClient.post('/auth/refresh'),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    apiClient.post('/auth/reset-password', { token, password }),

  verifyEmail: (token: string) =>
    apiClient.post('/auth/verify-email', { token }),

  getProfile: () =>
    apiClient.get('/auth/profile'),

  updateProfile: (data: any) =>
    apiClient.patch('/auth/profile', data),
}

// Apps API
export const appsApi = {
  getApps: (params?: any) =>
    apiClient.get('/apps', { params }),

  getApp: (id: string) =>
    apiClient.get(`/apps/${id}`),

  getFeaturedApps: () =>
    apiClient.get('/apps/featured'),

  getPopularApps: () =>
    apiClient.get('/apps/popular'),

  getRecentApps: () =>
    apiClient.get('/apps/recent'),

  searchApps: (query: string, filters?: any) =>
    apiClient.get('/apps/search', { params: { q: query, ...filters } }),

  getAppsByCategory: (categoryId: string, params?: any) =>
    apiClient.get(`/apps/category/${categoryId}`, { params }),

  getAppsByDeveloper: (developerId: string, params?: any) =>
    apiClient.get(`/apps/developer/${developerId}`, { params }),

  downloadApp: (id: string) =>
    apiClient.post(`/apps/${id}/download`),

  purchaseApp: (id: string, paymentData: any) =>
    apiClient.post(`/apps/${id}/purchase`, paymentData),
}

// Categories API
export const categoriesApi = {
  getCategories: () =>
    apiClient.get('/categories'),

  getCategory: (id: string) =>
    apiClient.get(`/categories/${id}`),
}

// Reviews API
export const reviewsApi = {
  getAppReviews: (appId: string, params?: any) =>
    apiClient.get(`/apps/${appId}/reviews`, { params }),

  createReview: (appId: string, reviewData: any) =>
    apiClient.post(`/apps/${appId}/reviews`, reviewData),

  updateReview: (reviewId: string, reviewData: any) =>
    apiClient.patch(`/reviews/${reviewId}`, reviewData),

  deleteReview: (reviewId: string) =>
    apiClient.delete(`/reviews/${reviewId}`),

  markReviewHelpful: (reviewId: string) =>
    apiClient.post(`/reviews/${reviewId}/helpful`),
}

// Developer API
export const developerApi = {
  getDeveloper: (id: string) =>
    apiClient.get(`/developers/${id}`),

  getDeveloperApps: (id: string, params?: any) =>
    apiClient.get(`/developers/${id}/apps`, { params }),

  getDeveloperAnalytics: (params?: any) =>
    apiClient.get('/developer/analytics', { params }),

  submitApp: (appData: FormData) =>
    apiClient.upload('/developer/apps', appData),

  updateApp: (id: string, appData: FormData) =>
    apiClient.upload(`/developer/apps/${id}`, appData),

  deleteApp: (id: string) =>
    apiClient.delete(`/developer/apps/${id}`),

  getPayouts: (params?: any) =>
    apiClient.get('/developer/payouts', { params }),
}

// User API
export const userApi = {
  getPurchases: (params?: any) =>
    apiClient.get('/user/purchases', { params }),

  getDownloads: (params?: any) =>
    apiClient.get('/user/downloads', { params }),

  getFavorites: (params?: any) =>
    apiClient.get('/user/favorites', { params }),

  addToFavorites: (appId: string) =>
    apiClient.post(`/user/favorites/${appId}`),

  removeFromFavorites: (appId: string) =>
    apiClient.delete(`/user/favorites/${appId}`),

  getPaymentMethods: () =>
    apiClient.get('/user/payment-methods'),

  addPaymentMethod: (paymentData: any) =>
    apiClient.post('/user/payment-methods', paymentData),

  deletePaymentMethod: (id: string) =>
    apiClient.delete(`/user/payment-methods/${id}`),
}

// Payments API
export const paymentsApi = {
  createPaymentIntent: (amount: number, currency: string, appId?: string) =>
    apiClient.post('/payments/create-intent', { amount, currency, appId }),

  confirmPayment: (paymentIntentId: string) =>
    apiClient.post('/payments/confirm', { paymentIntentId }),

  getPaymentHistory: (params?: any) =>
    apiClient.get('/payments/history', { params }),

  requestRefund: (paymentId: string, reason: string) =>
    apiClient.post(`/payments/${paymentId}/refund`, { reason }),
}

export default api