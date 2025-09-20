import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  BriefcaseIcon,
  PaintBrushIcon,
  CodeBracketIcon,
  CameraIcon,
  MusicalNoteIcon,
  PuzzlePieceIcon,
  AcademicCapIcon,
  HeartIcon,
  ShoppingCartIcon,
  ChartBarIcon,
  WrenchScrewdriverIcon,
  GlobeAltIcon,
  CloudIcon,
  PlusCircleIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline'
import { useAppsStore } from '../store'
import { cn } from '../lib/utils'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import AppCard from '../components/apps/AppCard'

const Categories: React.FC = () => {
  const { apps, categories, isLoading, setApps, setCategories, setLoading } = useAppsStore()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    // Mock data for demonstration
    setLoading(true)
    setTimeout(() => {
      const mockCategories = [
        { id: 'ide', name: 'IDE', description: 'Integrated Development Environments' },
        { id: 'saas', name: 'SaaS', description: 'Software as a Service solutions' },
        { id: 'plugin', name: 'Plugin', description: 'Extensions and plugins for existing software' },
        { id: 'addon', name: 'Addon', description: 'Add-ons and extensions' },
        { id: 'app', name: 'App', description: 'Mobile and desktop applications' },
        { id: 'software', name: 'Software', description: 'General software solutions' },
        { id: 'business', name: 'Business', description: 'Business and productivity apps' },
        { id: 'design', name: 'Design', description: 'Creative design tools' },
        { id: 'development', name: 'Development', description: 'Developer tools and IDEs' },
        { id: 'photography', name: 'Photography', description: 'Photo editing and management' },
        { id: 'music', name: 'Music', description: 'Audio and music production' },
        { id: 'games', name: 'Games', description: 'Entertainment and gaming' }
      ]
      setCategories(mockCategories)
      setLoading(false)
    }, 800)
  }, [])

  const categoryIcons: Record<string, React.ComponentType<any>> = {
    'ide': CodeBracketIcon,
    'saas': CloudIcon,
    'plugin': PuzzlePieceIcon,
    'addon': PlusCircleIcon,
    'app': DevicePhoneMobileIcon,
    'software': ComputerDesktopIcon,
    'productivity': BriefcaseIcon,
    'design': PaintBrushIcon,
    'development': CodeBracketIcon,
    'photography': CameraIcon,
    'music': MusicalNoteIcon,
    'games': PuzzlePieceIcon,
    'education': AcademicCapIcon,
    'health': HeartIcon,
    'shopping': ShoppingCartIcon,
    'business': ChartBarIcon,
    'utilities': WrenchScrewdriverIcon,
    'social': GlobeAltIcon
  }

  const getCategoryIcon = (categoryName: string) => {
    const key = categoryName.toLowerCase().replace(/\s+/g, '')
    return categoryIcons[key] || BriefcaseIcon
  }

  const filteredApps = selectedCategory 
    ? apps.filter(app => app.category === selectedCategory)
    : apps

  const getCategoryStats = (categoryId: string) => {
    const categoryApps = apps.filter(app => app.category === categoryId)
    return {
      count: categoryApps.length,
      avgRating: categoryApps.length > 0 
        ? categoryApps.reduce((sum, app) => sum + app.rating, 0) / categoryApps.length 
        : 0
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner size="lg" text="Loading categories..." />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-secondary-900 mb-4">
          Browse by Category
        </h1>
        <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
          Discover amazing apps organized by category. Find exactly what you need for your workflow.
        </p>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
        {categories.map((category) => {
          const Icon = getCategoryIcon(category.name)
          const stats = getCategoryStats(category.id)
          const isSelected = selectedCategory === category.id

          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(isSelected ? null : category.id)}
              className={cn(
                'p-6 rounded-xl border-2 transition-all duration-200 text-left group',
                isSelected
                  ? 'border-primary-500 bg-primary-50 shadow-lg'
                  : 'border-secondary-200 bg-white hover:border-primary-300 hover:shadow-md'
              )}
            >
              <div className="flex items-center mb-4">
                <div className={cn(
                  'p-3 rounded-lg transition-colors',
                  isSelected
                    ? 'bg-primary-100'
                    : 'bg-secondary-100 group-hover:bg-primary-100'
                )}>
                  <Icon className={cn(
                    'h-6 w-6 transition-colors',
                    isSelected
                      ? 'text-primary-600'
                      : 'text-secondary-600 group-hover:text-primary-600'
                  )} />
                </div>
                <div className="ml-4">
                  <h3 className={cn(
                    'text-lg font-semibold transition-colors',
                    isSelected
                      ? 'text-primary-900'
                      : 'text-secondary-900 group-hover:text-primary-900'
                  )}>
                    {category.name}
                  </h3>
                  <p className="text-sm text-secondary-600">
                    {stats.count} apps
                  </p>
                </div>
              </div>
              
              <p className="text-secondary-600 text-sm mb-4 line-clamp-2">
                {category.description}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={cn(
                          'h-4 w-4',
                          i < Math.floor(stats.avgRating) ? 'fill-current' : 'fill-secondary-300'
                        )}
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="ml-2 text-sm text-secondary-600">
                    {stats.avgRating.toFixed(1)}
                  </span>
                </div>
                
                <span className={cn(
                  'text-sm font-medium transition-colors',
                  isSelected
                    ? 'text-primary-600'
                    : 'text-secondary-500 group-hover:text-primary-600'
                )}>
                  {isSelected ? 'Selected' : 'Browse'}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Selected Category Apps */}
      {selectedCategory && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-secondary-900">
                {categories.find(c => c.id === selectedCategory)?.name} Apps
              </h2>
              <p className="text-secondary-600">
                {filteredApps.length} apps in this category
              </p>
            </div>
            <Link
              to={`/apps?category=${selectedCategory}`}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              View All
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredApps.slice(0, 8).map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>

          {filteredApps.length > 8 && (
            <div className="text-center mt-8">
              <Link
                to={`/apps?category=${selectedCategory}`}
                className="inline-flex items-center px-6 py-3 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
              >
                View All {filteredApps.length} Apps
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Popular Categories */}
      {!selectedCategory && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-secondary-900 mb-6">
            Popular Categories
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories
              .sort((a, b) => getCategoryStats(b.id).count - getCategoryStats(a.id).count)
              .slice(0, 6)
              .map((category) => {
                const Icon = getCategoryIcon(category.name)
                const stats = getCategoryStats(category.id)
                
                return (
                  <div
                    key={category.id}
                    className="bg-white rounded-lg border border-secondary-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center mb-4">
                      <div className="p-2 bg-primary-100 rounded-lg">
                        <Icon className="h-5 w-5 text-primary-600" />
                      </div>
                      <div className="ml-3">
                        <h3 className="font-semibold text-secondary-900">{category.name}</h3>
                        <p className="text-sm text-secondary-600">{stats.count} apps</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {apps
                        .filter(app => app.category === category.id)
                        .slice(0, 4)
                        .map((app) => (
                          <Link
                            key={app.id}
                            to={`/apps/${app.id}`}
                            className="flex items-center p-2 rounded-lg hover:bg-secondary-50 transition-colors"
                          >
                            <div className="w-8 h-8 bg-secondary-100 rounded mr-2"></div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-secondary-900 truncate">
                                {app.name}
                              </p>
                              <p className="text-xs text-secondary-600">
                                ${app.price}
                              </p>
                            </div>
                          </Link>
                        ))}
                    </div>
                    
                    <button
                      onClick={() => setSelectedCategory(category.id)}
                      className="w-full mt-4 px-4 py-2 text-sm text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
                    >
                      Browse All
                    </button>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Featured Apps */}
      {!selectedCategory && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-secondary-900">
              Featured Apps
            </h2>
            <Link
              to="/apps"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              View all apps →
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {apps
              .filter(app => app.featured)
              .slice(0, 8)
              .map((app) => (
                <AppCard key={app.id} app={app} />
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Categories