import React from 'react'
import { Link } from 'react-router-dom'
import { HeartIcon, ShoppingCartIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import { App } from '../../types'
import { formatCurrency, cn } from '../../lib/utils'
import { useCartStore, useNotificationStore } from '../../store'
import LoadingSpinner from '../ui/LoadingSpinner'

interface AppGridCardProps {
  app: App
  isFavorite?: boolean
  onToggleFavorite?: (appId: string) => void
}

const AppGridCard: React.FC<AppGridCardProps> = ({ 
  app, 
  isFavorite = false, 
  onToggleFavorite 
}) => {
  const { addItem, isItemLoading } = useCartStore()
  const { addNotification } = useNotificationStore()

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    await addItem(app)
    
    addNotification({
      type: 'success',
      title: 'Added to cart',
      message: `${app.name} has been added to your cart`
    })
  }

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onToggleFavorite?.(app.id)
  }

  return (
    <div className="group bg-white rounded-xl border border-secondary-200 hover:border-primary-300 hover:shadow-lg transition-all duration-200 overflow-hidden">
      <Link to={`/apps/${app.id}`} className="block">
        {/* App Icon */}
        <div className="aspect-square p-6">
          <img
            src={app.icon}
            alt={app.name}
            className="w-full h-full object-cover rounded-xl"
          />
        </div>

        {/* App Info */}
        <div className="p-6 pt-0">
          <h3 className="font-semibold text-lg text-secondary-900 group-hover:text-primary-600 transition-colors line-clamp-2 mb-2">
            {app.name}
          </h3>
          <p className="text-secondary-600 mb-3 line-clamp-1">
            {app.developer.name}
          </p>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <StarIconSolid
                  key={i}
                  className={cn(
                    'h-4 w-4',
                    i < Math.floor(app.rating) ? 'text-yellow-400' : 'text-secondary-300'
                  )}
                />
              ))}
            </div>
            <span className="text-sm text-secondary-600">
              {app.rating} ({app.reviewCount})
            </span>
          </div>

          {/* Category */}
          <div className="mb-4">
            <span className="inline-block px-3 py-1 text-sm font-medium bg-secondary-100 text-secondary-700 rounded-full">
              {app.category.name}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-secondary-600 line-clamp-2 mb-4">
            {app.description}
          </p>
        </div>
      </Link>

      {/* Price and Actions */}
      <div className="px-6 pb-6">
        <div className="flex items-center justify-between">
          <div className="text-xl font-bold text-primary-600">
            {app.price === 0 ? 'Free' : formatCurrency(app.price)}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Favorite Button */}
            <button
              onClick={handleToggleFavorite}
              className="p-2 rounded-lg hover:bg-secondary-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              aria-label={isFavorite ? `Remove ${app.name} from favorites` : `Add ${app.name} to favorites`}
              aria-pressed={isFavorite}
            >
              {isFavorite ? (
                <HeartIconSolid className="h-5 w-5 text-red-500" />
              ) : (
                <HeartIcon className="h-5 w-5 text-secondary-400" />
              )}
            </button>

            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              disabled={isItemLoading(app.id)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Add to cart"
              aria-label={`Add ${app.name} to cart for ${app.price === 0 ? 'free' : formatCurrency(app.price)}`}
            >
              {isItemLoading(app.id) ? (
                <LoadingSpinner size="sm" />
              ) : (
                <ShoppingCartIcon className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">
                {isItemLoading(app.id) ? 'Adding...' : 'Add'}
              </span>
            </button>
          </div>
        </div>

        {/* Download Count */}
        <div className="text-sm text-secondary-500 mt-2">
          {app.downloadCount} downloads
        </div>
      </div>
    </div>
  )
}

export default AppGridCard