import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { 
  SparklesIcon,
  StarIcon,
  ShoppingCartIcon,
  InformationCircleIcon,
  LightBulbIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'

import AISearchBar from '../components/apps/AISearchBar'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { aiSearchService, type AISearchResult } from '../services/aiSearchService'
import { useCartStore } from '../store'
import { formatCurrency, cn } from '../lib/utils'
import type { App } from '../types'

const AISearch: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchResults, setSearchResults] = useState<AISearchResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const { addItem } = useCartStore()

  const initialQuery = searchParams.get('q') || ''

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery)
    }
  }, [initialQuery])

  const performSearch = async (query: string) => {
    if (!query.trim()) return

    setIsLoading(true)
    try {
      const results = await aiSearchService.searchApps(query)
      setSearchResults(results)
      
      // Update URL
      setSearchParams({ q: query })
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNewSearch = (results: AISearchResult) => {
    setSearchResults(results)
  }

  const handleAddToCart = (app: App) => {
    addItem(app)
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            className={cn(
              "h-4 w-4",
              star <= rating ? "text-yellow-400 fill-current" : "text-secondary-300"
            )}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Header */}
      <div className="bg-white border-b border-secondary-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-6">
            <SparklesIcon className="h-8 w-8 text-primary-500" />
            <div>
              <h1 className="text-2xl font-bold text-secondary-900">AI-Powered App Search</h1>
              <p className="text-secondary-600">Discover apps with intelligent recommendations</p>
            </div>
          </div>
          
          <AISearchBar
            onResults={handleNewSearch}
            placeholder="Ask AI to find the perfect apps for your needs..."
            className="w-full"
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {searchResults && !isLoading && (
          <div className="space-y-8">
            {/* AI Explanation */}
            <div className="bg-gradient-to-r from-primary-50 to-purple-50 rounded-xl p-6 border border-primary-100">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <InformationCircleIcon className="h-6 w-6 text-primary-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-primary-900 mb-2">AI Analysis</h3>
                  <p className="text-primary-800 mb-4">{searchResults.explanation}</p>
                  <div className="text-sm text-primary-700">
                    <strong>Search Intent:</strong> {searchResults.searchIntent}
                  </div>
                </div>
              </div>
            </div>

            {/* Search Suggestions */}
            {searchResults.suggestions.length > 0 && (
              <div className="bg-white rounded-xl p-6 border border-secondary-200">
                <div className="flex items-center gap-2 mb-4">
                  <LightBulbIcon className="h-5 w-5 text-yellow-500" />
                  <h3 className="font-semibold text-secondary-900">Related Suggestions</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchResults.suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => performSearch(suggestion)}
                      className="px-3 py-2 bg-secondary-100 hover:bg-secondary-200 text-secondary-700 rounded-lg text-sm transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Results Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-secondary-900">
                  Search Results ({searchResults.apps.length} apps found)
                </h2>
                <p className="text-secondary-600">Sorted by relevance and AI recommendations</p>
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 border border-secondary-300 rounded-lg hover:bg-secondary-50 transition-colors"
              >
                <AdjustmentsHorizontalIcon className="h-4 w-4" />
                Filters
              </button>
            </div>

            {/* Search Results Grid */}
            {searchResults.apps.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.apps.map((app) => (
                  <div key={app.id} className="bg-white rounded-xl border border-secondary-200 hover:shadow-lg transition-shadow">
                    <div className="p-6">
                      {/* App Header */}
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                          {app.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-secondary-900 truncate">{app.name}</h3>
                          <p className="text-sm text-secondary-600">{app.developer.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {renderStars(app.rating)}
                            <span className="text-sm text-secondary-600">({app.rating})</span>
                          </div>
                        </div>
                      </div>

                      {/* App Description */}
                      <p className="text-secondary-700 text-sm mb-4 line-clamp-3">
                        {app.description}
                      </p>

                      {/* App Stats */}
                      <div className="flex items-center justify-between text-sm text-secondary-600 mb-4">
                        <span>{app.downloadCount.toLocaleString()} downloads</span>
                        <span className="capitalize">{app.category.name}</span>
                      </div>

                      {/* Price and Actions */}
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-semibold text-secondary-900">
                          {app.price === 0 ? 'Free' : formatCurrency(app.price)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/apps/${app.id}`}
                            className="px-3 py-2 text-primary-600 hover:text-primary-700 text-sm font-medium transition-colors"
                          >
                            View Details
                          </Link>
                          <button
                            onClick={() => handleAddToCart(app)}
                            className="flex items-center gap-1 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            <ShoppingCartIcon className="h-4 w-4" />
                            {app.price === 0 ? 'Get' : 'Buy'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <SparklesIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-secondary-900 mb-2">No apps found</h3>
                <p className="text-secondary-600 mb-4">Try adjusting your search query or browse our categories</p>
                <Link
                  to="/apps"
                  className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                >
                  Browse All Apps
                </Link>
              </div>
            )}
          </div>
        )}

        {!searchResults && !isLoading && (
          <div className="text-center py-12">
            <SparklesIcon className="h-16 w-16 text-primary-400 mx-auto mb-6" />
            <h2 className="text-2xl font-semibold text-secondary-900 mb-4">
              Discover Apps with AI
            </h2>
            <p className="text-secondary-600 mb-8 max-w-2xl mx-auto">
              Use natural language to describe what you're looking for. Our AI will understand your needs 
              and recommend the perfect apps for you.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {[
                'Find productivity apps for remote work',
                'Best design tools for beginners',
                'AI-powered development tools',
                'Free alternatives to expensive software',
                'Apps for small business management',
                'Creative tools for content creators'
              ].map((example, index) => (
                <button
                  key={index}
                  onClick={() => performSearch(example)}
                  className="p-4 bg-white border border-secondary-200 rounded-lg hover:border-primary-300 hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-center gap-2 text-primary-600 mb-2">
                    <SparklesIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">Try this</span>
                  </div>
                  <p className="text-secondary-700">{example}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AISearch