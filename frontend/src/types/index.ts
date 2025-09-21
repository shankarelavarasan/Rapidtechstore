// User and Authentication Types
export interface User {
  id: string
  name: string
  email: string
  username: string
  firstName?: string
  lastName?: string
  avatar?: string
  role: 'USER' | 'DEVELOPER' | 'ADMIN'
  isVerified: boolean
  createdAt: string
  updatedAt: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

// App and Store Types
export interface AppCategory {
  id: string
  name: string
  slug: string
  description: string
  icon: string
  appCount: number
}

export interface Developer {
  id: string
  name: string
  email: string
  website?: string
  avatar?: string
  bio?: string
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED'
  totalApps: number
  totalDownloads: number
  averageRating: number
  createdAt: string
}

export interface SystemRequirements {
  os: string[]
  minRam: string
  minStorage: string
  processor: string
  graphics?: string
  network?: string
}

export interface App {
  id: string
  name: string
  description: string
  shortDescription: string
  icon: string
  screenshots: string[]
  category: AppCategory
  subcategory: string
  version: string
  size: number
  price: number
  currency: string
  isPaid: boolean
  isPublished: boolean
  downloadCount: number
  rating: number
  reviewCount: number
  developer: Developer
  createdAt: string
  updatedAt: string
  tags: string[]
  features: string[]
  requirements: SystemRequirements
  changelog?: string
  reviews?: Review[]
}

// Review and Rating Types
export interface Review {
  id: string
  rating: number
  title: string
  content: string
  user: Pick<User, 'id' | 'username' | 'avatar'>
  app: Pick<App, 'id' | 'name'>
  isVerified: boolean
  helpfulCount: number
  createdAt: string
  updatedAt: string
}

// Payment and Subscription Types
export interface PaymentMethod {
  id: string
  type: 'CARD' | 'PAYPAL' | 'BANK_TRANSFER'
  last4?: string
  brand?: string
  expiryMonth?: number
  expiryYear?: number
  isDefault: boolean
}

export interface Purchase {
  id: string
  app: App
  user: User
  amount: number
  currency: string
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
  paymentMethod: string
  transactionId: string
  createdAt: string
}

export interface Subscription {
  id: string
  plan: SubscriptionPlan
  user: User
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAST_DUE'
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  createdAt: string
}

export interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price: number
  currency: string
  interval: 'MONTHLY' | 'YEARLY'
  features: string[]
  maxApps: number
  maxDownloads: number
}

// Analytics Types
export interface AppAnalytics {
  appId: string
  downloads: number
  views: number
  revenue: number
  rating: number
  reviewCount: number
  conversionRate: number
  period: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
  date: string
}

export interface DeveloperAnalytics {
  developerId: string
  totalRevenue: number
  totalDownloads: number
  totalViews: number
  averageRating: number
  topApps: App[]
  revenueByApp: Record<string, number>
  downloadsByApp: Record<string, number>
  period: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Form Types
export interface LoginForm {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterForm {
  email: string
  username: string
  password: string
  confirmPassword: string
  firstName?: string
  lastName?: string
  acceptTerms: boolean
}

export interface AppSubmissionForm {
  name: string
  description: string
  shortDescription: string
  category: string
  subcategory: string
  price: number
  isPaid: boolean
  tags: string[]
  features: string[]
  requirements: SystemRequirements
  icon: File | null
  screenshots: File[]
  appFile: File | null
}

// UI Component Types
export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface TableColumn<T = any> {
  key: keyof T
  label: string
  sortable?: boolean
  render?: (value: any, row: T) => React.ReactNode
}

export interface FilterOption {
  key: string
  label: string
  type: 'select' | 'range' | 'checkbox' | 'search'
  options?: SelectOption[]
  min?: number
  max?: number
}

// Store/State Types
export interface AppStore {
  apps: App[]
  categories: AppCategory[]
  featuredApps: App[]
  searchQuery: string
  selectedCategory: string | null
  sortBy: 'name' | 'price' | 'rating' | 'downloads' | 'date'
  sortOrder: 'asc' | 'desc'
  filters: Record<string, any>
  isLoading: boolean
  error: string | null
}

export interface CartItem {
  app: App
  quantity: number
}

export interface Cart {
  items: CartItem[]
  total: number
  currency: string
}

// Notification Types
export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

// Theme Types
export interface Theme {
  mode: 'light' | 'dark'
  primaryColor: string
  accentColor: string
}

// Error Types
export interface AppError {
  code: string
  message: string
  details?: any
  timestamp: string
}