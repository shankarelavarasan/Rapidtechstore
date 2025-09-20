import React, { useState, useEffect } from 'react'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useAppsStore } from '../../store'
import { cn } from '../../lib/utils'

interface SearchBarProps {
  onSearch?: (query: string) => void
  placeholder?: string
  className?: string
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  placeholder = "Search apps...",
  className 
}) => {
  const { searchQuery, setSearchQuery, fetchApps } = useAppsStore()
  const [localQuery, setLocalQuery] = useState(searchQuery)

  useEffect(() => {
    setLocalQuery(searchQuery)
  }, [searchQuery])

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (onSearch) {
      onSearch(query)
    } else {
      // Default behavior: fetch apps with search query
      await fetchApps({ search: query, page: 1 })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch(localQuery)
  }

  const handleClear = () => {
    setLocalQuery('')
    handleSearch('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClear()
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-secondary-400" />
        </div>
        
        <input
          type="text"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="block w-full pl-10 pr-10 py-2 border border-secondary-300 rounded-lg 
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                     placeholder-secondary-400 text-secondary-900 bg-white"
        />
        
        {localQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-secondary-600 text-secondary-400"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>
      
      {/* Hidden submit button for form submission */}
      <button type="submit" className="sr-only">
        Search
      </button>
    </form>
  )
}

export default SearchBar