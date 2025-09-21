import React, { useState, useEffect, useRef } from 'react'
import { 
  XMarkIcon, 
  SparklesIcon,
  ClockIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline'
import { cn } from '../../lib/utils'
import { aiSearchService, type AISearchResult } from '../../services/aiSearchService'


interface AISearchBarProps {
  onResults?: (results: AISearchResult) => void
  onSearch?: (query: string) => void
  placeholder?: string
  className?: string
  showSuggestions?: boolean
}

const AISearchBar: React.FC<AISearchBarProps> = ({ 
  onResults,
  onSearch, 
  placeholder = "Ask AI to find apps for you...",
  className,
  showSuggestions = true
}) => {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [suggestions] = useState([
    'Find productivity apps for remote work',
    'Best design tools for beginners',
    'AI-powered development tools',
    'Free alternatives to expensive software',
    'Apps for small business management',
    'Creative tools for content creators'
  ])

  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Load search history from localStorage
    const history = localStorage.getItem('ai_search_history')
    if (history) {
      setSearchHistory(JSON.parse(history).slice(0, 5))
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setShowDropdown(false)

    try {
      // Add to search history
      const newHistory = [searchQuery, ...searchHistory.filter(h => h !== searchQuery)].slice(0, 5)
      setSearchHistory(newHistory)
      localStorage.setItem('ai_search_history', JSON.stringify(newHistory))

      // Perform AI search
      const results = await aiSearchService.searchApps(searchQuery)
      
      if (onResults) {
        onResults(results)
      }
      
      if (onSearch) {
        onSearch(searchQuery)
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch(query)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    handleSearch(suggestion)
  }

  const handleClear = () => {
    setQuery('')
    setShowDropdown(false)
    inputRef.current?.focus()
  }

  const handleInputFocus = () => {
    if (showSuggestions) {
      setShowDropdown(true)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    if (showSuggestions && e.target.value.length === 0) {
      setShowDropdown(true)
    }
  }

  return (
    <div ref={searchRef} className={cn("relative w-full max-w-2xl", className)}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            {isSearching ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-500 border-t-transparent" />
            ) : (
              <SparklesIcon className="h-5 w-5 text-primary-500" />
            )}
          </div>
          
          <input
            id="ai-search"
            name="aiSearch"
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder={placeholder}
            disabled={isSearching}
            className="block w-full pl-12 pr-12 py-3 border border-secondary-300 rounded-xl 
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                       placeholder-secondary-400 text-secondary-900 bg-white shadow-sm
                       hover:shadow-md transition-all duration-200 text-lg
                       disabled:opacity-50 disabled:cursor-not-allowed"
          />
          
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-4 flex items-center hover:text-secondary-600 text-secondary-400 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
        
        <button type="submit" className="sr-only">
          Search
        </button>
      </form>

      {/* Search Dropdown */}
      {showDropdown && showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-secondary-200 z-50 max-h-96 overflow-y-auto">
          {/* Search History */}
          {searchHistory.length > 0 && (
            <div className="p-4 border-b border-secondary-100">
              <div className="flex items-center gap-2 text-sm font-medium text-secondary-700 mb-3">
                <ClockIcon className="h-4 w-4" />
                Recent Searches
              </div>
              <div className="space-y-2">
                {searchHistory.map((historyItem, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(historyItem)}
                    className="block w-full text-left px-3 py-2 text-sm text-secondary-600 hover:bg-secondary-50 rounded-lg transition-colors"
                  >
                    {historyItem}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI Suggestions */}
          <div className="p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-secondary-700 mb-3">
              <LightBulbIcon className="h-4 w-4" />
              AI Suggestions
            </div>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="block w-full text-left px-3 py-2 text-sm text-secondary-600 hover:bg-primary-50 hover:text-primary-700 rounded-lg transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* AI Badge */}
          <div className="px-4 py-3 bg-gradient-to-r from-primary-50 to-purple-50 border-t border-secondary-100">
            <div className="flex items-center gap-2 text-xs text-secondary-600">
              <SparklesIcon className="h-4 w-4 text-primary-500" />
              <span>Powered by AI for intelligent app discovery</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AISearchBar