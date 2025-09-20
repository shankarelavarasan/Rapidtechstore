import { App, AppCategory } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export interface AppsResponse {
  success: boolean
  data: App[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  error?: string
}

export interface AppResponse {
  success: boolean
  data: App
  error?: string
}

export interface CategoriesResponse {
  success: boolean
  data: AppCategory[]
  error?: string
}

export interface AppsQueryParams {
  page?: number
  limit?: number
  category?: string
  search?: string
  featured?: boolean
  sortBy?: 'downloads' | 'rating' | 'price' | 'newest'
  sortOrder?: 'asc' | 'desc'
}

class AppsService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token')
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  }

  async getApps(params: AppsQueryParams = {}): Promise<AppsResponse> {
    try {
      const queryParams = new URLSearchParams()
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString())
        }
      })

      const response = await fetch(
        `${API_BASE_URL}/apps/public?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch apps')
      }

      return data
    } catch (error) {
      console.error('Error fetching apps:', error)
      return {
        success: false,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        error: error instanceof Error ? error.message : 'Failed to fetch apps'
      }
    }
  }

  async getAppById(id: string): Promise<AppResponse> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/apps/public/${id}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch app')
      }

      return data
    } catch (error) {
      console.error('Error fetching app:', error)
      return {
        success: false,
        data: {} as App,
        error: error instanceof Error ? error.message : 'Failed to fetch app'
      }
    }
  }

  async getCategories(): Promise<CategoriesResponse> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/apps/categories`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch categories')
      }

      return data
    } catch (error) {
      console.error('Error fetching categories:', error)
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to fetch categories'
      }
    }
  }

  async getFeaturedApps(): Promise<AppsResponse> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/apps/featured`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch featured apps')
      }

      return data
    } catch (error) {
      console.error('Error fetching featured apps:', error)
      return {
        success: false,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        error: error instanceof Error ? error.message : 'Failed to fetch featured apps'
      }
    }
  }

  async getTopCharts(type?: 'free' | 'paid' | 'grossing', category?: string, limit?: number): Promise<AppsResponse> {
    try {
      const queryParams = new URLSearchParams()
      
      if (type) queryParams.append('type', type)
      if (category) queryParams.append('category', category)
      if (limit) queryParams.append('limit', limit.toString())

      const response = await fetch(
        `${API_BASE_URL}/apps/top-charts?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch top charts')
      }

      return data
    } catch (error) {
      console.error('Error fetching top charts:', error)
      return {
        success: false,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        error: error instanceof Error ? error.message : 'Failed to fetch top charts'
      }
    }
  }

  async downloadApp(appId: string): Promise<{ success: boolean; downloadUrl?: string; error?: string }> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/users/download/${appId}`,
        {
          method: 'POST',
          headers: this.getAuthHeaders()
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to download app')
      }

      return data
    } catch (error) {
      console.error('Error downloading app:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download app'
      }
    }
  }

  async addReview(appId: string, reviewData: { rating: number; comment: string }): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/apps/${appId}/reviews`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(reviewData)
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add review')
      }

      return data
    } catch (error) {
      console.error('Error adding review:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add review'
      }
    }
  }
}

export default new AppsService()