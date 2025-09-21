import React from 'react'
import { Link } from 'react-router-dom'
import { HeartIcon, ShoppingCartIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import { App } from '../../types'
import { formatCurrency, cn } from '../../lib/utils'
import { useCartStore, useNotificationStore } from '../../store'

interface AppCardProps {
  app: App
  isFavorite?: boolean
  onToggleFavorite?: (appId: string) => void
  className?: string
}

const AppCard: React.FC<AppCardProps> = ({ 
  app, 
  isFavorite = false, 
  onToggleFavorite,
  className 
}) => {
  const { addItem } = useCartStore()
  const { addNotification } = useNotificationStore()

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    addItem(app)
    
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
    <Link
      to={`/apps/${app.id}`}
      className={cn(
        'group block bg-white rounded-xl border border-secondary-200 hover:border-primary-300 hover:shadow-lg transition-all duration-200 overflow-hidden',
        className
      )}
    >
      {/* App Icon */}
      <div className="aspect-square p-4">
        <img
          src={app.icon}
          alt={app.name}
          className="w-full h-full object-cover rounded-lg"
        />
      </div>

      {/* App Info */}
      <div className="p-4 pt-0">
        <h3 className="font-semibold text-secondary-900 group-hover:text-primary-600 transition-colors line-clamp-1">
          {app.name}
        </h3>
        <p className="text-sm text-secondary-600 mt-1 line-clamp-1">
          {app.developer.name}
        </p>

        {/* Rating */}
        <div className="flex items-center gap-1 mt-2">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <StarIconSolid
                key={i}
                className={cn(
                  'h-3 w-3',
                  i < Math.floor(app.rating) ? 'text-yellow-400' : 'text-secondary-300'
                )}
              />
            ))}
          </div>
          <span className="text-xs text-secondary-600 ml-1">
            {app.rating} ({app.reviewCount})
          </span>
        </div>

        {/* Category */}
        <div className="mt-2">
          <span className="inline-block px-2 py-1 text-xs font-medium bg-secondary-100 text-secondary-700 rounded-full">
            {app.category.name}
          </span>
        </div>

        {/* Price and Actions */}
        <div className="flex items-center justify-between mt-4">
          <div className="font-semibold text-primary-600">
            {app.price === 0 ? 'Free' : formatCurrency(app.price)}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Favorite Button */}
            <button
              onClick={handleToggleFavorite}
              className="p-1.5 rounded-lg hover:bg-secondary-100 transition-colors"
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isFavorite ? (
                <HeartIconSolid className="h-4 w-4 text-red-500" />
              ) : (
                <HeartIcon className="h-4 w-4 text-secondary-400" />
              )}
            </button>

            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              className="p-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
              title="Add to cart"
            >
              <ShoppingCartIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Download Count */}
        <div className="text-xs text-secondary-500 mt-2">
          {app.downloadCount} downloads
        </div>
      </div>
    </Link>
  )
}

export default AppCard