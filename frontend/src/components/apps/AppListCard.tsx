import React from 'react'
import { Link } from 'react-router-dom'
import { StarIcon, HeartIcon, ShoppingCartIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import { App } from '../../types'
import { formatCurrency, cn, truncateText } from '../../lib/utils'
import { useCartStore, useNotificationStore } from '../../store'

interface AppListCardProps {
  app: App
  isFavorite?: boolean
  onToggleFavorite?: (appId: string) => void
}

const AppListCard: React.FC<AppListCardProps> = ({ 
  app, 
  isFavorite = false, 
  onToggleFavorite 
}) => {
  const { addToCart } = useCartStore()
  const { addNotification } = useNotificationStore()

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    addToCart({
      id: app.id,
      name: app.name,
      price: app.price,
      image: app.icon,
      developer: app.developer
    })
    
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
    <div className="group bg-white rounded-lg border border-secondary-200 hover:border-primary-300 hover:shadow-md transition-all duration-200 overflow-hidden">
      <Link to={`/apps/${app.id}`} className="block">
        <div className="flex p-6">
          {/* App Icon */}
          <div className="flex-shrink-0 w-20 h-20 mr-6">
            <img
              src={app.icon}
              alt={app.name}
              className="w-full h-full object-cover rounded-lg"
            />
          </div>

          {/* App Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg text-secondary-900 group-hover:text-primary-600 transition-colors line-clamp-1 mb-1">
                  {app.name}
                </h3>
                <p className="text-secondary-600 mb-2 line-clamp-1">
                  by {app.developer.companyName}
                </p>

                {/* Rating and Category */}
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-1">
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
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-secondary-100 text-secondary-700 rounded-full">
                    {app.category}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm text-secondary-600 line-clamp-2">
                  {truncateText(app.description, 150)}
                </p>
              </div>

              {/* Price and Actions */}
              <div className="flex-shrink-0 ml-6 text-right">
                <div className="text-xl font-bold text-primary-600 mb-4">
                  {app.price === 0 ? 'Free' : formatCurrency(app.price)}
                </div>
                
                <div className="flex items-center gap-2 justify-end">
                  {/* Favorite Button */}
                  <button
                    onClick={handleToggleFavorite}
                    className="p-2 rounded-lg hover:bg-secondary-100 transition-colors"
                    title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
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
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
                    title="Add to cart"
                  >
                    <ShoppingCartIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">Add to Cart</span>
                  </button>
                </div>

                {/* Download Count */}
                <div className="text-sm text-secondary-500 mt-2">
                  {app.downloads} downloads
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}

export default AppListCard