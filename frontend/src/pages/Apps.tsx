import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { 
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ShoppingCartIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { useAppsStore, useCartStore } from '../store'
import { formatCurrency, cn } from '../lib/utils'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import SearchBar from '../components/apps/SearchBar'
import type { App } from '../types'

const Apps: React.FC = () => {
  const [searchParams] = useSearchParams()
  const { apps, loading, fetchApps } = useAppsStore()
  const { addItem, isItemLoading } = useCartStore()
  
  const [filteredApps, setFilteredApps] = useState<App[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState('name')
  const [filterCategory, setFilterCategory] = useState('all')
  const [priceRange] = useState<[number, number]>([0, 1000])
  const [showFilters, setShowFilters] = useState(false)

  const categories = ['all', 'ide', 'saas', 'plugin', 'addon', 'app', 'software', 'productivity', 'games', 'design', 'development', 'business', 'education']
  const sortOptions = [
    { value: 'name', label: 'Name A-Z' },
    { value: 'name-desc', label: 'Name Z-A' },
    { value: 'price', label: 'Price Low-High' },
    { value: 'price-desc', label: 'Price High-Low' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'newest', label: 'Newest First' },
    { value: 'popular', label: 'Most Popular' },
  ]

  useEffect(() => {
    fetchApps()
  }, [fetchApps])

  useEffect(() => {
    let filtered = [...apps]

    // Apply category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(app => 
        app.category?.name.toLowerCase() === filterCategory.toLowerCase()
      )
    }

    // Apply price range filter
    filtered = filtered.filter(app => 
      app.price >= priceRange[0] && app.price <= priceRange[1]
    )

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'name-desc':
          return b.name.localeCompare(a.name)
        case 'price':
          return a.price - b.price
        case 'price-desc':
          return b.price - a.price
        case 'rating':
          return (b.rating || 0) - (a.rating || 0)
        case 'newest':
          return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
        case 'popular':
          return (b.downloadCount || 0) - (a.downloadCount || 0)
        default:
          return 0
      }
    })

    setFilteredApps(filtered)
  }, [apps, filterCategory, priceRange, sortBy])

  // Handle URL parameters
  useEffect(() => {
    const category = searchParams.get('category')
    const sort = searchParams.get('sort')
    
    if (category) setFilterCategory(category)
    if (sort) setSortBy(sort)
  }, [searchParams])

  const handleAddToCart = async (app: App) => {
    await addItem(app)
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

  const AppGridCard: React.FC<{ app: App }> = ({ app }) => (
    <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden hover:shadow-lg transition-all duration-300 group">
      <div className="relative">
        {app.screenshots && app.screenshots.length > 0 ? (
          <img
            src={app.screenshots[0]}
            alt={app.name}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <span className="text-white text-4xl font-bold">
              {app.name.charAt(0)}
            </span>
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
            <div className="h-12 w-12 bg-white rounded-lg shadow-lg flex items-center justify-center">
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
            {renderStars(app.rating || 0)}
            <span className="text-sm text-secondary-500">
              ({app.reviewCount || 0})
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Link
              to={`/apps/${app.id}`}
              className="btn-ghost px-3 py-1 text-sm"
            >
              View
            </Link>
            <button
              onClick={() => handleAddToCart(app)}
              disabled={isItemLoading(app.id)}
              className="btn-primary px-3 py-1 text-sm flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isItemLoading(app.id) ? (
                <LoadingSpinner size="sm" />
              ) : (
                <ShoppingCartIcon className="h-4 w-4" />
              )}
              <span>{isItemLoading(app.id) ? 'Adding...' : 'Add'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const AppListCard: React.FC<{ app: App }> = ({ app }) => (
    <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center space-x-4">
        {app.icon ? (
          <img
            src={app.icon}
            alt={app.name}
            className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="h-16 w-16 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xl">
              {app.name.charAt(0)}
            </span>
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-secondary-900 hover:text-primary-600 transition-colors">
                {app.name}
              </h3>
              <p className="text-secondary-600">{app.developer.name}</p>
              <p className="text-sm text-secondary-600 mt-1 line-clamp-2">
                {app.description}
              </p>
              
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-1">
                  {renderStars(app.rating || 0)}
                  <span className="text-sm text-secondary-500">
                    ({app.reviewCount || 0})
                  </span>
                </div>
                {app.category && (
                  <span className="text-xs bg-secondary-100 text-secondary-700 px-2 py-1 rounded-full">
                    {app.category.name}
                  </span>
                )}
              </div>
            </div>
            
            <div className="text-right ml-4">
              <p className="text-xl font-bold text-secondary-900 mb-2">
                {app.price === 0 ? 'Free' : formatCurrency(app.price)}
              </p>
              <div className="flex items-center space-x-2">
                <Link
                  to={`/apps/${app.id}`}
                  className="btn-ghost px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 min-w-[44px] min-h-[44px]"
                  aria-label={`View details for ${app.name}`}
                >
                  View Details
                </Link>
                <button
                  onClick={() => handleAddToCart(app)}
                  className="btn-primary px-4 py-2 flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 min-w-[44px] min-h-[44px]"
                  aria-label={`Add ${app.name} to cart for ${app.price === 0 ? 'free' : formatCurrency(app.price)}`}
                >
                  <ShoppingCartIcon className="h-4 w-4" aria-hidden="true" />
                  <span>Add to Cart</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading apps..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary-900 mb-2">
            Browse Apps
          </h1>
          <p className="text-secondary-600">
            Discover amazing applications for every need
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <SearchBar 
            className="max-w-2xl mx-auto"
            placeholder="Search for apps, developers, or categories..."
          />
        </div>

        {/* Filters and Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Left side - Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 btn-ghost px-4 py-2 lg:hidden"
              >
                <FunnelIcon className="h-4 w-4" />
                <span>Filters</span>
              </button>
              
              <div className={cn(
                'flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4',
                !showFilters && 'hidden lg:flex'
              )}>
                {/* Category Filter */}
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right side - View controls */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary-600">
                {filteredApps.length} apps found
              </span>
              
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    viewMode === 'grid' 
                      ? 'bg-primary-100 text-primary-600' 
                      : 'text-secondary-400 hover:text-secondary-600'
                  )}
                >
                  <Squares2X2Icon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    viewMode === 'list' 
                      ? 'bg-primary-100 text-primary-600' 
                      : 'text-secondary-400 hover:text-secondary-600'
                  )}
                >
                  <ListBulletIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Apps Grid/List */}
        {filteredApps.length === 0 ? (
          <div className="text-center py-12">
            <AdjustmentsHorizontalIcon className="mx-auto h-12 w-12 text-secondary-400" />
            <h3 className="mt-4 text-lg font-medium text-secondary-900">
              No apps found
            </h3>
            <p className="mt-1 text-secondary-500">
              Try adjusting your filters or search criteria.
            </p>
          </div>
        ) : (
          <div className={cn(
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
          )}>
            {filteredApps.map((app) => (
              viewMode === 'grid' ? (
                <AppGridCard key={app.id} app={app} />
              ) : (
                <AppListCard key={app.id} app={app} />
              )
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Apps