import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  ArrowRightIcon,
  PlayIcon,
  ShoppingCartIcon,
  TrophyIcon,
  FireIcon,
  SparklesIcon,
  KeyIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { useAppsStore, useCartStore } from '../store'
import { formatCurrency, cn } from '../lib/utils'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import InteractiveTour from '../components/demo/InteractiveTour'
import CredentialsModal from '../components/demo/CredentialsModal'
import MobilePreview from '../components/demo/MobilePreview'
import DemoReport from '../components/demo/DemoReport'
import { App } from '../types'

const Home: React.FC = () => {
  const { apps, loading: isLoading, setApps, setLoading } = useAppsStore()
  const { addItem } = useCartStore()
  const [featuredApps, setFeaturedApps] = useState<App[]>([])
  const [popularApps, setPopularApps] = useState<App[]>([])
  const [newApps, setNewApps] = useState<App[]>([])
  const [showTour, setShowTour] = useState(false)
  const [showCredentials, setShowCredentials] = useState(false)

  useEffect(() => {
    // Load realistic demo data for investor presentation
    setLoading(true)
    setTimeout(() => {
      // Import realistic data from our comprehensive mock data file
      import('../data/mockData').then(({ mockApps, featuredApps, popularApps, newApps }) => {
        setApps(mockApps)
        setFeaturedApps(featuredApps)
        setPopularApps(popularApps)
        setNewApps(newApps)
        setLoading(false)
      })
    }, 800)
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
            <p className="text-sm text-secondary-600">{app.developer.name}</p>
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
              className="btn-ghost btn-animated px-3 py-1 text-sm"
            >
              View
            </Link>
            <button
              onClick={() => handleAddToCart(app)}
              className="btn-primary btn-glow px-3 py-1 text-sm flex items-center space-x-1"
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
              <Link to="/apps" className="btn-secondary btn-animated px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg w-full sm:w-auto">
                Browse All Apps
              </Link>
              <Link to="/categories" className="btn-outline-white btn-glow px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg w-full sm:w-auto">
                Explore Categories
              </Link>
              <button 
                onClick={() => setShowTour(true)}
                className="btn-accent btn-animated px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg w-full sm:w-auto flex items-center gap-2"
              >
                <PlayIcon className="h-5 w-5" />
                Start Tour
              </button>
              <button 
                onClick={() => setShowCredentials(true)}
                className="btn-primary btn-glow px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base w-full sm:w-auto flex items-center gap-2"
              >
                <KeyIcon className="h-4 w-4" />
                Demo Access
              </button>
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

      {/* Competitive Comparison Section */}
      <section className="py-16 bg-gradient-to-br from-secondary-50 to-primary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-secondary-900 mb-4">
              Why Choose Rapid Tech Store?
            </h2>
            <p className="text-lg text-secondary-600 max-w-3xl mx-auto">
              Experience the next generation of app distribution with features that go beyond traditional app stores
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Rapid Tech Store */}
            <div className="bg-white rounded-xl p-8 shadow-lg border-2 border-primary-200 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                  Rapid Tech Store
                </span>
              </div>
              <div className="mt-4">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrophyIcon className="h-8 w-8 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-bold text-secondary-900">Our Platform</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center text-sm">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    <span>Instant deployment & scaling</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    <span>AI-powered app discovery</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    <span>Developer-friendly revenue share (85%)</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    <span>Real-time analytics & insights</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    <span>Cross-platform compatibility</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    <span>24/7 developer support</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Traditional App Stores */}
            <div className="bg-white rounded-xl p-8 shadow-md border border-secondary-200">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📱</span>
                </div>
                <h3 className="text-xl font-bold text-secondary-900">Traditional Stores</h3>
                <p className="text-sm text-secondary-500 mt-1">Play Store, App Store</p>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                  <span>Complex approval process (weeks)</span>
                </li>
                <li className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
                  <span>Basic search functionality</span>
                </li>
                <li className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                  <span>High commission fees (30%)</span>
                </li>
                <li className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
                  <span>Limited analytics</span>
                </li>
                <li className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
                  <span>Platform restrictions</span>
                </li>
                <li className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                  <span>Limited support channels</span>
                </li>
              </ul>
            </div>

            {/* No-Code Platforms */}
            <div className="bg-white rounded-xl p-8 shadow-md border border-secondary-200">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔧</span>
                </div>
                <h3 className="text-xl font-bold text-secondary-900">No-Code Platforms</h3>
                <p className="text-sm text-secondary-500 mt-1">Bubble, Adalo, etc.</p>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                  <span>Limited customization</span>
                </li>
                <li className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                  <span>No marketplace distribution</span>
                </li>
                <li className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
                  <span>Template-based limitations</span>
                </li>
                <li className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                  <span>Basic performance metrics</span>
                </li>
                <li className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                  <span>Vendor lock-in</span>
                </li>
                <li className="flex items-center text-sm">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
                  <span>Community-based support</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Key Advantages */}
          <div className="bg-white rounded-xl p-8 shadow-lg border border-primary-200">
            <h3 className="text-2xl font-bold text-center text-secondary-900 mb-8">
              Our Competitive Advantages
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-green-600 font-bold text-lg">85%</span>
                </div>
                <h4 className="font-semibold text-secondary-900 mb-2">Revenue Share</h4>
                <p className="text-sm text-secondary-600">vs 70% on traditional stores</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 font-bold text-lg">24h</span>
                </div>
                <h4 className="font-semibold text-secondary-900 mb-2">Deployment</h4>
                <p className="text-sm text-secondary-600">vs weeks for approval</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-purple-600 font-bold text-lg">AI</span>
                </div>
                <h4 className="font-semibold text-secondary-900 mb-2">Smart Discovery</h4>
                <p className="text-sm text-secondary-600">Intelligent app matching</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-orange-600 font-bold text-lg">∞</span>
                </div>
                <h4 className="font-semibold text-secondary-900 mb-2">Scalability</h4>
                <p className="text-sm text-secondary-600">Auto-scaling infrastructure</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Preview Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <MobilePreview />
        </div>
      </section>

      {/* Demo Report Section */}
      <section className="py-16 bg-secondary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-secondary-900 mb-4">
              Investment Analytics
            </h2>
            <p className="text-lg text-secondary-600">
              Download comprehensive reports for stakeholders and investors
            </p>
          </div>
          <div className="max-w-2xl mx-auto">
            <DemoReport />
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-secondary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-secondary-900 mb-4" data-tour="categories">
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
                <TrophyIcon className="h-8 w-8 text-yellow-500" />
                <h2 className="text-3xl font-bold text-secondary-900" data-tour="featured">
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
            className="btn-secondary btn-animated btn-pulse px-8 py-3 text-lg"
          >
            Become a Developer
          </Link>
        </div>
      </section>

      {/* Interactive Tour */}
      <InteractiveTour
        isVisible={showTour}
        onClose={() => setShowTour(false)}
      />

      {/* Credentials Modal */}
      <CredentialsModal
        isOpen={showCredentials}
        onClose={() => setShowCredentials(false)}
      />
    </div>
  )
}

export default Home