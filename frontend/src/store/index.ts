import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, App, AppCategory, CartItem, Notification } from '../types'
import { AuthService } from '../services/authService'

// Auth Store
interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateUser: (user: Partial<User>) => void
  updateProfile: (data: Partial<User>) => Promise<void>
  setLoading: (loading: boolean) => void
  validateToken: () => Promise<boolean>
  setAuthData: (user: User, token: string) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true })
        try {
          const response = await AuthService.login({ email, password })
          if (response.success && response.user && response.token) {
            localStorage.setItem('auth_token', response.token)
            set({ 
              user: response.user, 
              token: response.token, 
              isAuthenticated: true,
              isLoading: false 
            })
          } else {
            set({ isLoading: false })
            throw new Error(response.error || 'Login failed')
          }
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      register: async (name: string, email: string, password: string) => {
        set({ isLoading: true })
        try {
          const response = await AuthService.register({
            username: name,
            email,
            password,
            firstName: name.split(' ')[0],
            lastName: name.split(' ').slice(1).join(' ') || undefined
          })
          if (response.success && response.user && response.token) {
            localStorage.setItem('auth_token', response.token)
            set({ 
              user: response.user, 
              token: response.token, 
              isAuthenticated: true,
              isLoading: false 
            })
          } else {
            set({ isLoading: false })
            throw new Error(response.error || 'Registration failed')
          }
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: async () => {
        set({ isLoading: true })
        try {
          await AuthService.logout()
        } finally {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('user')
          set({ 
            user: null, 
            token: null, 
            isAuthenticated: false,
            isLoading: false 
          })
        }
      },

      updateUser: (userData) => {
        const currentUser = get().user
        if (currentUser) {
          set({ user: { ...currentUser, ...userData } })
        }
      },

      updateProfile: async (data: Partial<User>) => {
        set({ isLoading: true })
        try {
          const response = await AuthService.updateProfile(data)
          if (response.success && response.user) {
            set({ 
              user: response.user,
              isLoading: false 
            })
          } else {
            set({ isLoading: false })
            throw new Error(response.error || 'Profile update failed')
          }
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      validateToken: async () => {
        const token = localStorage.getItem('auth_token')
        if (!token) {
          set({ isAuthenticated: false, user: null, token: null })
          return false
        }

        try {
          const isValid = await AuthService.validateToken()
          if (!isValid) {
            localStorage.removeItem('auth_token')
            set({ isAuthenticated: false, user: null, token: null })
            return false
          }
          
          // If token is valid but we don't have user data, fetch it
          if (!get().user) {
            const profileResponse = await AuthService.getProfile()
            if (profileResponse.success && profileResponse.user) {
              set({ 
                user: profileResponse.user, 
                token, 
                isAuthenticated: true 
              })
            }
          }
          
          return true
        } catch (error) {
          localStorage.removeItem('auth_token')
          set({ isAuthenticated: false, user: null, token: null })
          return false
        }
      },

      setAuthData: (user: User, token: string) => {
        localStorage.setItem('auth_token', token)
        set({ user, token, isAuthenticated: true })
      },

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
)

// Apps Store
interface AppsStore {
  apps: App[]
  categories: AppCategory[]
  featuredApps: App[]
  popularApps: App[]
  recentApps: App[]
  searchQuery: string
  selectedCategory: string | null
  sortBy: 'name' | 'price' | 'rating' | 'downloads' | 'date'
  sortOrder: 'asc' | 'desc'
  filters: Record<string, any>
  loading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  
  // Actions
  fetchApps: (params?: any) => Promise<void>
  fetchAppById: (id: string) => Promise<App | null>
  fetchCategories: () => Promise<void>
  fetchFeaturedApps: () => Promise<void>
  fetchTopCharts: (type?: 'free' | 'paid' | 'grossing', category?: string) => Promise<void>
  addReview: (appId: string, rating: number, comment: string) => Promise<void>
  setApps: (apps: App[]) => void
  setCategories: (categories: AppCategory[]) => void
  setFeaturedApps: (apps: App[]) => void
  setPopularApps: (apps: App[]) => void
  setRecentApps: (apps: App[]) => void
  setSearchQuery: (query: string) => void
  setSelectedCategory: (categoryId: string | null) => void
  setSortBy: (sortBy: 'name' | 'price' | 'rating' | 'downloads' | 'date') => void
  setSortOrder: (order: 'asc' | 'desc') => void
  setFilters: (filters: Record<string, any>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearFilters: () => void
}

export const useAppsStore = create<AppsStore>((set, get) => ({
  apps: [],
  categories: [],
  featuredApps: [],
  popularApps: [],
  recentApps: [],
  searchQuery: '',
  selectedCategory: null,
  sortBy: 'name',
  sortOrder: 'asc',
  filters: {},
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  },

  fetchApps: async (params = {}) => {
    set({ loading: true, error: null })
    try {
      const { default: appsService } = await import('../services/appsService')
      const response = await appsService.getApps(params)
      
      if (response.success) {
        set({ 
          apps: response.data, 
          pagination: response.pagination,
          loading: false 
        })
      } else {
        set({ 
          error: response.error || 'Failed to fetch apps',
          loading: false 
        })
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch apps',
        loading: false 
      })
    }
  },

  fetchAppById: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const { default: appsService } = await import('../services/appsService')
      const response = await appsService.getAppById(id)
      
      if (response.success) {
        set({ loading: false })
        return response.data
      } else {
        set({ 
          error: response.error || 'Failed to fetch app',
          loading: false 
        })
        return null
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch app',
        loading: false 
      })
      return null
    }
  },

  fetchCategories: async () => {
    try {
      const { default: appsService } = await import('../services/appsService')
      const response = await appsService.getCategories()
      
      if (response.success) {
        set({ categories: response.data })
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  },

  fetchFeaturedApps: async () => {
    try {
      const { default: appsService } = await import('../services/appsService')
      const response = await appsService.getFeaturedApps()
      
      if (response.success) {
        set({ featuredApps: response.data })
      }
    } catch (error) {
      console.error('Failed to fetch featured apps:', error)
    }
  },

  fetchTopCharts: async (type, category) => {
    try {
      const { default: appsService } = await import('../services/appsService')
      const response = await appsService.getTopCharts(type, category)
      
      if (response.success) {
        if (type === 'free') {
          set({ popularApps: response.data })
        } else {
          set({ recentApps: response.data })
        }
      }
    } catch (error) {
      console.error('Failed to fetch top charts:', error)
    }
  },

  setApps: (apps) => set({ apps }),
  setCategories: (categories) => set({ categories }),
  setFeaturedApps: (featuredApps) => set({ featuredApps }),
  setPopularApps: (popularApps) => set({ popularApps }),
  setRecentApps: (recentApps) => set({ recentApps }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  setFilters: (filters) => set({ filters }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearFilters: () => set({ filters: {}, selectedCategory: null, searchQuery: '' }),

  addReview: async (appId: string, rating: number, comment: string) => {
    try {
      const { default: appsService } = await import('../services/appsService')
      const response = await appsService.addReview(appId, { rating, comment })
      
      if (response.success) {
        // Create a mock review object since the API doesn't return the review data
        const newReview = {
          id: Date.now().toString(),
          rating,
          title: 'Review Title',
          content: comment,
          user: { id: 'current-user', username: 'Current User', avatar: '' },
          app: { id: appId, name: '' },
          isVerified: false,
          helpfulCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        // Update the app in the apps array with the new review
        const apps = get().apps
        const updatedApps = apps.map(app => {
          if (app.id === appId) {
            return {
              ...app,
              reviews: [...(app.reviews || []), newReview],
              reviewCount: (app.reviewCount || 0) + 1
            }
          }
          return app
        })
        set({ apps: updatedApps })
      }
    } catch (error) {
      console.error('Failed to add review:', error)
      throw error
    }
  },
}))

// Cart Store
interface CartStore {
  items: CartItem[]
  total: number
  currency: string
  isOpen: boolean
  isLoading: boolean
  loadingItems: Set<string>
  
  // Actions
  addItem: (app: App) => void
  removeItem: (appId: string) => void
  updateQuantity: (appId: string, quantity: number) => void
  clearCart: () => void
  toggleCart: () => void
  setCartOpen: (open: boolean) => void
  calculateTotal: () => void
  setLoading: (loading: boolean) => void
  setItemLoading: (appId: string, loading: boolean) => void
  isItemLoading: (appId: string) => boolean
  
  // Alias methods for compatibility
  addToCart: (app: App) => void
  getTotal: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      total: 0,
      currency: 'USD',
      isOpen: false,
      isLoading: false,
      loadingItems: new Set<string>(),

      addItem: async (app) => {
        const appId = app.id
        get().setItemLoading(appId, true)
        
        try {
          // Simulate async operation (could be API call in real app)
          await new Promise(resolve => setTimeout(resolve, 300))
          
          const items = get().items
          const existingItem = items.find(item => item.app.id === app.id)
          
          if (existingItem) {
            set({
              items: items.map(item =>
                item.app.id === app.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              )
            })
          } else {
            set({ items: [...items, { app, quantity: 1 }] })
          }
          
          get().calculateTotal()
        } catch (error) {
          console.error('Failed to add item to cart:', error)
        } finally {
          get().setItemLoading(appId, false)
        }
      },

      removeItem: async (appId) => {
        get().setItemLoading(appId, true)
        
        try {
          // Simulate async operation
          await new Promise(resolve => setTimeout(resolve, 200))
          
          set({ items: get().items.filter(item => item.app.id !== appId) })
          get().calculateTotal()
        } catch (error) {
          console.error('Failed to remove item from cart:', error)
        } finally {
          get().setItemLoading(appId, false)
        }
      },

      updateQuantity: async (appId, quantity) => {
        if (quantity <= 0) {
          await get().removeItem(appId)
          return
        }
        
        get().setItemLoading(appId, true)
        
        try {
          // Simulate async operation
          await new Promise(resolve => setTimeout(resolve, 200))
          
          set({
            items: get().items.map(item =>
              item.app.id === appId ? { ...item, quantity } : item
            )
          })
          get().calculateTotal()
        } catch (error) {
          console.error('Failed to update quantity:', error)
        } finally {
          get().setItemLoading(appId, false)
        }
      },

      clearCart: async () => {
        get().setLoading(true)
        
        try {
          // Simulate async operation
          await new Promise(resolve => setTimeout(resolve, 300))
          set({ items: [], total: 0 })
        } catch (error) {
          console.error('Failed to clear cart:', error)
        } finally {
          get().setLoading(false)
        }
      },

      toggleCart: () => set({ isOpen: !get().isOpen }),

      setCartOpen: (isOpen) => set({ isOpen }),

      calculateTotal: () => {
        const total = get().items.reduce(
          (sum, item) => sum + (item.app.price * item.quantity),
          0
        )
        set({ total })
      },

      setLoading: (isLoading) => set({ isLoading }),

      setItemLoading: (appId, loading) => {
        const loadingItems = new Set(get().loadingItems)
        if (loading) {
          loadingItems.add(appId)
        } else {
          loadingItems.delete(appId)
        }
        set({ loadingItems })
      },

      isItemLoading: (appId) => get().loadingItems.has(appId),

      // Alias methods for compatibility
      addToCart: (app) => get().addItem(app),
      getTotal: () => get().total,
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({ items: state.items, total: state.total, currency: state.currency }),
    }
  )
)

// Notifications Store
interface NotificationsStore {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
}

export const useNotificationStore = create<NotificationsStore>((set, get) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newNotification = { ...notification, id }
    
    set({ notifications: [...get().notifications, newNotification] })
    
    // Auto remove after duration
    if (notification.duration !== 0) {
      setTimeout(() => {
        get().removeNotification(id)
      }, notification.duration || 5000)
    }
  },

  removeNotification: (id) => {
    set({ notifications: get().notifications.filter(n => n.id !== id) })
  },

  clearNotifications: () => set({ notifications: [] }),
}))

// UI Store
interface UIStore {
  theme: 'light' | 'dark'
  sidebarOpen: boolean
  mobileMenuOpen: boolean
  
  // Actions
  toggleTheme: () => void
  setTheme: (theme: 'light' | 'dark') => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleMobileMenu: () => void
  setMobileMenuOpen: (open: boolean) => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      theme: 'light',
      sidebarOpen: true,
      mobileMenuOpen: false,

      toggleTheme: () => {
        const newTheme = get().theme === 'light' ? 'dark' : 'light'
        set({ theme: newTheme })
        document.documentElement.classList.toggle('dark', newTheme === 'dark')
      },

      setTheme: (theme) => {
        set({ theme })
        document.documentElement.classList.toggle('dark', theme === 'dark')
      },

      toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleMobileMenu: () => set({ mobileMenuOpen: !get().mobileMenuOpen }),
      setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
)