import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  StarIcon, 
  ArrowRightIcon,
  PlayIcon,
  ShoppingCartIcon,
  TrophyIcon,
  FireIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { useAppsStore, useCartStore } from '../store'
import { formatCurrency, cn } from '../lib/utils'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import type { App } from '../types'

const Home: React.FC = () => {
  const { apps, loading: isLoading, setApps, setLoading } = useAppsStore()
  const { addItem } = useCartStore()
  const [featuredApps, setFeaturedApps] = useState<App[]>([])
  const [popularApps, setPopularApps] = useState<App[]>([])
  const [newApps, setNewApps] = useState<App[]>([])

  useEffect(() => {
    // Mock data for demonstration
    setLoading(true)
    setTimeout(() => {
      const mockApps: App[] = [
        {
          id: '1',
          name: 'PhotoEditor Pro',
          category: 'photography',
          price: 29.99,
          rating: 4.8,
          downloads: 150000,
          description: 'Professional photo editing software',
          developer: {
            userId: 'dev1',
            companyName: 'Creative Studios',
            verified: true
          },
          requirements: {
            os: 'Windows 10+',
            ram: '8GB',
            storage: '2GB'
          }
        },
        {
          id: '2',
          name: 'Code Assistant',
          category: 'development',
          price: 0,
          rating: 4.9,
          downloads: 500000,
          description: 'AI-powered coding assistant',
          developer: {
            userId: 'dev2',
            companyName: 'DevTools Inc',
            verified: true
          },
          requirements: {
            os: 'Windows 10+',
            ram: '4GB',
            storage: '1GB'
          }
        }
      ]
      setApps(mockApps)
      setLoading(false)
    }, 1000)
  }, [])

  useEffect(() => {
    if (apps.length > 0) {
      // Simulate featured, popular, and new apps
      setFeaturedApps(apps.slice(0, 6))
      setPopularApps(apps.slice(6, 12))
      setNewApps(apps.slice(12, 18))
    }
  }, [apps])

  const categories = [
    { name: 'IDE', icon: '⚡', count: 23, color: 'bg-yellow-500' },
    { name: 'SaaS', icon: '☁️', count: 67, color: 'bg-cyan-500' },
    { name: 'Plugin', icon: '🔌', count: 89, color: 'bg-red-500' },
    { name: 'Software', icon: '💾', count: 156, color: 'bg-gray-500' },
    { name: 'Productivity', icon: '💼', count: 45, color: 'bg-blue-500' },
    { name: 'Games', icon: '🎮', count: 128, color: 'bg-purple-500' },
    { name: 'Design', icon: '🎨', count: 67, color: 'bg-pink-500' },
    { name: 'Development', icon: '💻', count: 89, color: 'bg-green-500' },
  ]

  const handleAddToCart = (app: App) => {
    addItem(app)
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIconSolid
            key={star}
            className={cn(
              'h-4 w-4',
              star <= rating ? 'text-yellow-400' : 'text-secondary-300'
            )}
          />
        ))}
      </div>
    )
  }

  const AppCard: React.FC<{ app: App; featured?: boolean }> = ({ app, featured = false }) => (
    <div className={cn(
      'bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden hover:shadow-lg transition-all duration-300 group card-hover',
      featured && 'lg:col-span-2'
    )}>
      <div className="relative">
        {app.screenshots && app.screenshots.length > 0 ? (
          <img
            src={app.screenshots[0]}
            alt={app.name}
            className={cn(
              'w-full object-cover',
              featured ? 'h-48' : 'h-32'
            )}
          />
        ) : (
          <div className={cn(
            'w-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center',
            featured ? 'h-48' : 'h-32'
          )}>
            <PlayIcon className="h-12 w-12 text-white opacity-75" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          {app.icon ? (
            <img
              src={app.icon}
              alt={app.name}
              className="h-12 w-12 rounded-lg shadow-lg"
            />
          ) : (
            <div className="h-12 w-12 bg-white rounded-lg shadow-lg flex items-center justify-center icon-hover">
              <span className="text-primary-600 font-bold text-lg">
                {app.name.charAt(0)}
              </span>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-secondary-900 group-hover:text-primary-600 transition-colors">
              {app.name}
            </h3>
            <p className="text-sm text-secondary-600">{app.developer.companyName}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-secondary-900">
              {app.price === 0 ? 'Free' : formatCurrency(app.price)}
            </p>
          </div>
        </div>
        
        <p className="text-sm text-secondary-600 mb-3 line-clamp-2">
          {app.description}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {renderStars(app.rating)}
            <span className="text-sm text-secondary-500">
              ({app.reviewCount || 0})
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Link
              to={`/apps/${app.id}`}
              className="btn-ghost px-3 py-1 text-sm hover-lift"
            >
              View
            </Link>
            <button
              onClick={() => handleAddToCart(app)}
              className="btn-primary px-3 py-1 text-sm flex items-center space-x-1 hover-lift"
            >
              <ShoppingCartIcon className="h-4 w-4" />
              <span>Add</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading amazing apps..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-accent-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
              Discover Amazing
              <span className="block text-accent-300 mt-2">Apps & Games</span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-primary-100 mb-6 sm:mb-8 max-w-3xl mx-auto leading-relaxed px-4">
              Your premier destination for cutting-edge applications, games, and digital solutions. 
              Download, deploy, and transform your digital experience.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center max-w-md sm:max-w-none mx-auto">
              <Link to="/apps" className="btn-secondary px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg w-full sm:w-auto">
                Browse All Apps
              </Link>
              <Link to="/categories" className="btn-outline-white px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg w-full sm:w-auto">
                Explore Categories
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white border-b border-secondary-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600">1000+</div>
              <div className="text-secondary-600">Apps Available</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600">50K+</div>
              <div className="text-secondary-600">Happy Users</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600">500+</div>
              <div className="text-secondary-600">Developers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600">99.9%</div>
              <div className="text-secondary-600">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-secondary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-secondary-900 mb-4">
              Browse by Category
            </h2>
            <p className="text-lg text-secondary-600">
              Find the perfect apps for your needs
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {categories.map((category) => (
              <Link
                key={category.name}
                to={`/apps?category=${category.name.toLowerCase()}`}
                className="group hover-lift"
              >
                <div className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-all duration-300 border border-secondary-200 group-hover:border-primary-300">
                  <div className={cn(
                    'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl icon-hover',
                    category.color
                  )}>
                    {category.icon}
                  </div>
                  <h3 className="font-semibold text-secondary-900 group-hover:text-primary-600 transition-colors">
                    {category.name}
                  </h3>
                  <p className="text-sm text-secondary-500 mt-1">
                    {category.count} apps
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Apps */}
      {featuredApps.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <TrophyIcon className="h-8 w-8 text-accent-500" />
                <h2 className="text-3xl font-bold text-secondary-900">
                  Featured Apps
                </h2>
              </div>
              <Link
                to="/apps?featured=true"
                className="nav-link flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium"
              >
                <span>View All</span>
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredApps.map((app) => (
                <AppCard key={app.id} app={app} featured />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Popular Apps */}
      {popularApps.length > 0 && (
        <section className="py-16 bg-secondary-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <FireIcon className="h-8 w-8 text-red-500" />
                <h2 className="text-3xl font-bold text-secondary-900">
                  Popular This Week
                </h2>
              </div>
              <Link
                to="/apps?sort=popular"
                className="nav-link flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium"
              >
                <span>View All</span>
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {popularApps.map((app) => (
                <AppCard key={app.id} app={app} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* New Apps */}
      {newApps.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <SparklesIcon className="h-8 w-8 text-green-500" />
                <h2 className="text-3xl font-bold text-secondary-900">
                  New Releases
                </h2>
              </div>
              <Link
                to="/apps?sort=newest"
                className="nav-link flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium"
              >
                <span>View All</span>
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {newApps.map((app) => (
                <AppCard key={app.id} app={app} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-primary-600 to-accent-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Build Something Amazing?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Join thousands of developers who trust Rapid Tech Store to distribute their apps.
          </p>
          <Link
            to="/developer"
            className="btn-secondary px-8 py-3 text-lg hover-lift"
          >
            Become a Developer
          </Link>
        </div>
      </section>
    </div>
  )
}

export default Home