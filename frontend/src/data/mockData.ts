// Realistic Demo Data for Investor Presentation
// This file contains comprehensive, realistic data to showcase the platform's capabilities

import { App } from '../types'

// Re-export App type for external use
export type { App } from '../types'

export interface Category {
  id: string
  name: string
  slug: string
  description: string
  icon: string
  appCount: number
}

export interface Purchase {
  id: string
  appId: string
  appName: string
  developer: string
  price: number
  purchaseDate: string
  status: 'completed' | 'pending' | 'refunded'
  licenseKey?: string
}

export interface DeveloperStats {
  totalRevenue: number
  totalDownloads: number
  averageRating: number
  publishedApps: number
  monthlyGrowth: {
    revenue: number
    downloads: number
    rating: number
  }
}

// Realistic App Catalog
export const mockApps: App[] = [
  {
    id: '1',
    name: 'IntelliCode Pro',
    description: 'IntelliCode Pro revolutionizes your coding experience with advanced AI-powered suggestions, intelligent refactoring, and real-time code analysis. Supports 15+ programming languages with seamless IDE integration.',
    shortDescription: 'AI-powered code completion and refactoring tool for professional developers',
    icon: '/icons/intellicode-pro.svg',
    screenshots: ['/screenshots/intellicode-1.jpg', '/screenshots/intellicode-2.jpg'],
    category: {
      id: 'development',
      name: 'Development',
      slug: 'development',
      description: 'IDEs, code editors, and developer tools',
      icon: '/icons/development.svg',
      appCount: 245
    },
    subcategory: 'IDE',
    version: '3.2.1',
    size: 2147483648, // 2.1GB in bytes
    price: 89.99,
    currency: 'USD',
    isPaid: true,
    isPublished: true,
    downloadCount: 125000,
    rating: 4.9,
    reviewCount: 8420,
    developer: {
      id: 'dev001',
      name: 'CodeCraft Technologies',
      email: 'support@codecraft.tech',
      website: 'https://codecraft.tech',
      verificationStatus: 'VERIFIED',
      totalApps: 5,
      totalDownloads: 250000,
      averageRating: 4.8,
      createdAt: '2023-01-15T00:00:00Z'
    },
    createdAt: '2023-06-15T00:00:00Z',
    updatedAt: '2024-01-20T00:00:00Z',
    tags: ['AI', 'IDE', 'Productivity', 'Development'],
    features: [
      'AI-powered code completion',
      'Intelligent refactoring suggestions',
      'Real-time error detection',
      'Multi-language support (Python, JavaScript, Java, C++, etc.)',
      'Git integration',
      'Team collaboration tools'
    ],
    requirements: {
      os: ['Windows 10+', 'macOS 10.15+', 'Linux Ubuntu 18.04+'],
      minRam: '8GB',
      minStorage: '2.5GB',
      processor: 'Intel i5 or equivalent'
    }
  },
  {
    id: '2',
    name: 'DesignFlow Studio',
    description: 'DesignFlow Studio is the ultimate design tool for creating stunning user interfaces and experiences. Features include vector editing, prototyping, design systems, and real-time collaboration.',
    shortDescription: 'Professional UI/UX design suite with collaborative features',
    icon: '/icons/designflow-studio.svg',
    screenshots: ['/screenshots/designflow-1.jpg', '/screenshots/designflow-2.jpg'],
    category: {
      id: 'design',
      name: 'Design',
      slug: 'design',
      description: 'UI/UX design, graphics, and creative tools',
      icon: '/icons/design.svg',
      appCount: 189
    },
    subcategory: 'UI/UX Design',
    version: '2.8.0',
    size: 3435973837, // 3.2GB in bytes
    price: 49.99,
    currency: 'USD',
    isPaid: true,
    isPublished: true,
    downloadCount: 89000,
    rating: 4.8,
    reviewCount: 5670,
    developer: {
      id: 'dev002',
      name: 'Pixel Perfect Inc.',
      email: 'hello@pixelperfect.design',
      website: 'https://pixelperfect.design',
      verificationStatus: 'VERIFIED',
      totalApps: 3,
      totalDownloads: 150000,
      averageRating: 4.7,
      createdAt: '2022-08-10T00:00:00Z'
    },
    createdAt: '2023-03-20T00:00:00Z',
    updatedAt: '2024-01-18T00:00:00Z',
    tags: ['Design', 'UI/UX', 'Prototyping', 'Collaboration'],
    features: [
      'Vector-based design tools',
      'Interactive prototyping',
      'Design system management',
      'Real-time collaboration',
      'Plugin ecosystem',
      'Export to multiple formats'
    ],
    requirements: {
      os: ['Windows 10+', 'macOS 10.14+'],
      minRam: '16GB',
      minStorage: '4GB',
      processor: 'Intel i7 or equivalent',
      graphics: 'Dedicated GPU recommended'
    }
  },
  {
    id: '3',
    name: 'DataViz Analytics',
    description: 'Transform your raw data into actionable insights with DataViz Analytics. Features advanced charting, real-time dashboards, predictive analytics, and seamless integration with popular data sources.',
    shortDescription: 'Advanced data visualization and business intelligence platform',
    icon: '/icons/dataviz-analytics.svg',
    screenshots: ['/screenshots/dataviz-1.jpg', '/screenshots/dataviz-2.jpg'],
    category: {
      id: 'business',
      name: 'Business',
      slug: 'business',
      description: 'Analytics, CRM, and enterprise solutions',
      icon: '/icons/business.svg',
      appCount: 156
    },
    subcategory: 'Business Intelligence',
    version: '4.1.2',
    size: 7301444403, // 6.8GB in bytes
    price: 129.99,
    currency: 'USD',
    isPaid: true,
    isPublished: true,
    downloadCount: 45000,
    rating: 4.7,
    reviewCount: 2890,
    developer: {
      id: 'dev003',
      name: 'Analytics Pro Solutions',
      email: 'enterprise@analyticspro.com',
      website: 'https://analyticspro.com',
      verificationStatus: 'VERIFIED',
      totalApps: 7,
      totalDownloads: 200000,
      averageRating: 4.6,
      createdAt: '2021-05-15T00:00:00Z'
    },
    createdAt: '2022-11-10T00:00:00Z',
    updatedAt: '2024-01-22T00:00:00Z',
    tags: ['Analytics', 'Business Intelligence', 'Data Science', 'Enterprise'],
    features: [
      'Advanced data visualization',
      'Real-time dashboards',
      'Predictive analytics',
      'Multi-source data integration',
      'Custom reporting',
      'Enterprise security'
    ],
    requirements: {
      os: ['Windows 10+', 'macOS 10.15+', 'Linux'],
      minRam: '32GB',
      minStorage: '8GB',
      processor: 'Intel i9 or equivalent',
      graphics: 'High-end GPU for complex visualizations'
    }
  },
  {
    id: '4',
    name: 'SecureVault Pro',
    description: 'SecureVault Pro provides military-grade encryption for your passwords, documents, and sensitive data. Features include biometric authentication, secure sharing, and cross-platform synchronization.',
    shortDescription: 'Enterprise-grade password manager and digital vault',
    icon: '/icons/securevault-pro.svg',
    screenshots: ['/screenshots/securevault-1.jpg', '/screenshots/securevault-2.jpg'],
    category: {
      id: 'security',
      name: 'Security',
      slug: 'security',
      description: 'Antivirus, encryption, and privacy tools',
      icon: '/icons/security.svg',
      appCount: 87
    },
    subcategory: 'Password Manager',
    version: '5.3.1',
    size: 471859200, // 450MB in bytes
    price: 39.99,
    currency: 'USD',
    isPaid: true,
    isPublished: true,
    downloadCount: 156000,
    rating: 4.9,
    reviewCount: 12450,
    developer: {
      id: 'dev004',
      name: 'CyberShield Security',
      email: 'support@cybershield.security',
      website: 'https://cybershield.security',
      verificationStatus: 'VERIFIED',
      totalApps: 4,
      totalDownloads: 300000,
      averageRating: 4.8,
      createdAt: '2020-03-12T00:00:00Z'
    },
    createdAt: '2021-07-20T00:00:00Z',
    updatedAt: '2024-01-25T00:00:00Z',
    tags: ['Security', 'Password Manager', 'Encryption', 'Privacy'],
    features: [
      'AES-256 encryption',
      'Biometric authentication',
      'Secure password generation',
      'Cross-platform sync',
      'Secure document storage',
      'Team sharing capabilities'
    ],
    requirements: {
      os: ['Windows 8+', 'macOS 10.12+', 'iOS 12+', 'Android 8+'],
      minRam: '4GB',
      minStorage: '500MB',
      processor: 'Any modern processor'
    }
  },
  {
    id: '5',
    name: 'CloudSync Enterprise',
    description: 'CloudSync Enterprise offers seamless file synchronization across all your devices with enterprise-grade security. Free tier includes 50GB storage with premium plans available.',
    shortDescription: 'Free cloud synchronization and backup solution',
    icon: '/icons/cloudsync-enterprise.svg',
    screenshots: ['/screenshots/cloudsync-1.jpg', '/screenshots/cloudsync-2.jpg'],
    category: {
      id: 'productivity',
      name: 'Productivity',
      slug: 'productivity',
      description: 'Office suites, task management, and utilities',
      icon: '/icons/productivity.svg',
      appCount: 298
    },
    subcategory: 'Cloud Storage',
    version: '7.2.0',
    size: 188743680, // 180MB in bytes
    price: 0,
    currency: 'USD',
    isPaid: false,
    isPublished: true,
    downloadCount: 890000,
    rating: 4.6,
    reviewCount: 45670,
    developer: {
      id: 'dev005',
      name: 'SyncTech Solutions',
      email: 'enterprise@synctech.cloud',
      website: 'https://synctech.cloud',
      verificationStatus: 'VERIFIED',
      totalApps: 6,
      totalDownloads: 1200000,
      averageRating: 4.5,
      createdAt: '2019-11-08T00:00:00Z'
    },
    createdAt: '2020-02-14T00:00:00Z',
    updatedAt: '2024-01-24T00:00:00Z',
    tags: ['Cloud Storage', 'Backup', 'Sync', 'Productivity'],
    features: [
      'Real-time file sync',
      'Automatic backup',
      'Version history',
      'Team collaboration',
      'End-to-end encryption',
      'Mobile apps'
    ],
    requirements: {
      os: ['Windows 7+', 'macOS 10.10+', 'Linux', 'iOS 10+', 'Android 6+'],
      minRam: '2GB',
      minStorage: '200MB',
      processor: 'Any modern processor',
      network: 'Internet connection required'
    }
  },
  {
    id: '6',
    name: 'GameDev Toolkit',
    description: 'GameDev Toolkit provides everything you need to create stunning games. Includes a powerful 3D engine, visual scripting, physics simulation, and access to thousands of assets.',
    shortDescription: 'Complete game development suite with 3D engine and asset store',
    icon: '/icons/gamedev-toolkit.svg',
    screenshots: ['/screenshots/gamedev-1.jpg', '/screenshots/gamedev-2.jpg'],
    category: {
      id: 'development',
      name: 'Development',
      slug: 'development',
      description: 'IDEs, code editors, and developer tools',
      icon: '/icons/development.svg',
      appCount: 245
    },
    subcategory: 'Game Development',
    version: '2.1.0',
    size: 11274289152, // 10.5GB in bytes
    price: 199.99,
    currency: 'USD',
    isPaid: true,
    isPublished: true,
    downloadCount: 34000,
    rating: 4.8,
    reviewCount: 1890,
    developer: {
      id: 'dev006',
      name: 'Indie Game Studios',
      email: 'developers@indiegamestudios.com',
      website: 'https://indiegamestudios.com',
      verificationStatus: 'VERIFIED',
      totalApps: 2,
      totalDownloads: 50000,
      averageRating: 4.7,
      createdAt: '2022-01-20T00:00:00Z'
    },
    createdAt: '2023-05-10T00:00:00Z',
    updatedAt: '2024-01-19T00:00:00Z',
    tags: ['Game Development', '3D Engine', 'Visual Scripting', 'VR/AR'],
    features: [
      '3D game engine',
      'Visual scripting system',
      'Physics simulation',
      'Asset marketplace',
      'Multi-platform deployment',
      'VR/AR support'
    ],
    requirements: {
      os: ['Windows 10+', 'macOS 10.15+'],
      minRam: '16GB',
      minStorage: '12GB',
      processor: 'Intel i7 or equivalent',
      graphics: 'Dedicated GPU with 4GB+ VRAM'
    }
  }
]

// Realistic Categories
export const mockCategories: Category[] = [
  { id: 'development', name: 'Development', slug: 'development', description: 'IDEs, code editors, and developer tools', icon: '/icons/development.svg', appCount: 245 },
  { id: 'design', name: 'Design', slug: 'design', description: 'UI/UX design, graphics, and creative tools', icon: '/icons/design.svg', appCount: 189 },
  { id: 'business', name: 'Business', slug: 'business', description: 'Analytics, CRM, and enterprise solutions', icon: '/icons/business.svg', appCount: 156 },
  { id: 'productivity', name: 'Productivity', slug: 'productivity', description: 'Office suites, task management, and utilities', icon: '/icons/productivity.svg', appCount: 298 },
  { id: 'security', name: 'Security', slug: 'security', description: 'Antivirus, encryption, and privacy tools', icon: '/icons/security.svg', appCount: 87 },
  { id: 'photography', name: 'Photography', slug: 'photography', description: 'Photo editing and management tools', icon: '/icons/photography.svg', appCount: 134 },
  { id: 'music', name: 'Music', slug: 'music', description: 'Audio production and music creation', icon: '/icons/music.svg', appCount: 76 },
  { id: 'games', name: 'Games', slug: 'games', description: 'Entertainment and gaming applications', icon: '/icons/games.svg', appCount: 423 },
  { id: 'education', name: 'Education', slug: 'education', description: 'Learning and educational software', icon: '/icons/education.svg', appCount: 167 },
  { id: 'finance', name: 'Finance', slug: 'finance', description: 'Accounting, trading, and financial tools', icon: '/icons/finance.svg', appCount: 92 }
]

// Realistic Purchase History
export const mockPurchases: Purchase[] = [
  {
    id: 'purchase_001',
    appId: '1',
    appName: 'IntelliCode Pro',
    developer: 'CodeCraft Technologies',
    price: 89.99,
    purchaseDate: '2024-01-20',
    status: 'completed',
    licenseKey: 'ICODE-PRO-2024-XXXX-YYYY'
  },
  {
    id: 'purchase_002',
    appId: '2',
    appName: 'DesignFlow Studio',
    developer: 'Pixel Perfect Inc.',
    price: 49.99,
    purchaseDate: '2024-01-15',
    status: 'completed',
    licenseKey: 'DESIGN-FLOW-2024-AAAA-BBBB'
  },
  {
    id: 'purchase_003',
    appId: '4',
    appName: 'SecureVault Pro',
    developer: 'CyberShield Security',
    price: 39.99,
    purchaseDate: '2024-01-10',
    status: 'completed',
    licenseKey: 'SECURE-VAULT-2024-CCCC-DDDD'
  }
]

// Developer Dashboard Stats
export const mockDeveloperStats: DeveloperStats = {
  totalRevenue: 89166.75,
  totalDownloads: 2140,
  averageRating: 4.77,
  publishedApps: 3,
  monthlyGrowth: {
    revenue: 12.5,
    downloads: 8.2,
    rating: 0.3
  }
}

// Platform Statistics
export const platformStats = {
  totalApps: 1867,
  totalUsers: 127500,
  totalDevelopers: 892,
  totalRevenue: 12450000,
  monthlyActiveUsers: 89000,
  averageRating: 4.6,
  totalDownloads: 5670000
}

// Featured Apps (for homepage)
export const featuredApps = mockApps.slice(0, 3)

// Popular Apps (highest downloads)
export const popularApps = [...mockApps].sort((a, b) => b.downloadCount - a.downloadCount).slice(0, 4)

// New Apps (recently updated)
export const newApps = [...mockApps].sort((a, b) => 
  new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
).slice(0, 4)

// Revenue Analytics Data
export const revenueAnalytics = {
  monthly: [
    { month: 'Aug 2023', revenue: 45000, downloads: 12000 },
    { month: 'Sep 2023', revenue: 52000, downloads: 14500 },
    { month: 'Oct 2023', revenue: 61000, downloads: 16800 },
    { month: 'Nov 2023', revenue: 78000, downloads: 19200 },
    { month: 'Dec 2023', revenue: 95000, downloads: 22100 },
    { month: 'Jan 2024', revenue: 127000, downloads: 28900 }
  ],
  topCategories: [
    { category: 'Development', revenue: 3200000, percentage: 35.2 },
    { category: 'Business', revenue: 2100000, percentage: 23.1 },
    { category: 'Design', revenue: 1800000, percentage: 19.8 },
    { category: 'Productivity', revenue: 1200000, percentage: 13.2 },
    { category: 'Security', revenue: 780000, percentage: 8.7 }
  ]
}