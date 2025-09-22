import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  HeartIcon, 
  ShareIcon, 
  ShieldCheckIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  GlobeAltIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import { useAppsStore, useCartStore, useAuthStore, useNotificationStore } from '../store'
import { formatCurrency, formatDate, cn } from '../lib/utils'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Modal from '../components/ui/Modal'

const AppDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { apps, loading, fetchAppById, addReview } = useAppsStore()
  const { addItem, isItemLoading } = useCartStore()
  const { user } = useAuthStore()
  const { addNotification } = useNotificationStore()

  const [app, setApp] = useState<any>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: ''
  })
  const [isFavorite, setIsFavorite] = useState(false)

  useEffect(() => {
    if (id) {
      const existingApp = apps.find(a => a.id === id)
      if (existingApp) {
        setApp(existingApp)
      } else {
        fetchAppById(id).then(setApp)
      }
    }
  }, [id, apps, fetchAppById])

  const handleAddToCart = async () => {
    if (!app) return
    
    await addItem(app)
    
    addNotification({
      type: 'success',
      title: 'Added to cart',
      message: `${app.name} has been added to your cart`
    })
  }

  const handleBuyNow = async () => {
    await handleAddToCart()
    navigate('/checkout')
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !app) {
      addNotification({
        type: 'error',
        title: 'Authentication required',
        message: 'Please sign in to leave a review'
      })
      return
    }

    try {
      await addReview(app.id, reviewForm.rating, reviewForm.comment)
      setShowReviewModal(false)
      setReviewForm({ rating: 5, comment: '' })
      addNotification({
        type: 'success',
        title: 'Review submitted',
        message: 'Thank you for your feedback!'
      })
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to submit review',
        message: 'Please try again later'
      })
    }
  }

  const nextImage = () => {
    if (app?.screenshots) {
      setCurrentImageIndex((prev) => 
        prev === app.screenshots.length - 1 ? 0 : prev + 1
      )
    }
  }

  const prevImage = () => {
    if (app?.screenshots) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? app.screenshots.length - 1 : prev - 1
      )
    }
  }

  if (loading || !app) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading app details..." />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-8 mb-8">
        {/* App Icon and Basic Info */}
        <div className="flex-shrink-0">
          <img
            src={app.icon}
            alt={app.name}
            className="w-32 h-32 rounded-2xl shadow-lg"
          />
        </div>

        {/* App Details */}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-secondary-900 mb-2">
                {app.name}
              </h1>
              <p className="text-lg text-secondary-600 mb-2">
                by {app.developer.name}
              </p>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <StarIconSolid
                      key={i}
                      className={cn(
                        'h-5 w-5',
                        i < Math.floor(app.rating) ? 'text-yellow-400' : 'text-secondary-300'
                      )}
                    />
                  ))}
                  <span className="ml-2 text-sm text-secondary-600">
                    {app.rating} ({app.reviewCount} reviews)
                  </span>
                </div>
                <span className="text-sm text-secondary-500">
                  {app.downloads} downloads
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className="p-2 rounded-lg border border-secondary-300 hover:bg-secondary-50"
              >
                {isFavorite ? (
                  <HeartIconSolid className="h-5 w-5 text-red-500" />
                ) : (
                  <HeartIcon className="h-5 w-5 text-secondary-400" />
                )}
              </button>
              <button className="p-2 rounded-lg border border-secondary-300 hover:bg-secondary-50">
                <ShareIcon className="h-5 w-5 text-secondary-400" />
              </button>
            </div>
          </div>

          {/* Platform Support */}
          <div className="flex items-center gap-4 mb-6">
            <span className="text-sm font-medium text-secondary-700">Available on:</span>
            <div className="flex items-center gap-2">
              {app.platforms?.includes('web') && (
                <GlobeAltIcon className="h-5 w-5 text-secondary-500" />
              )}
              {app.platforms?.includes('desktop') && (
                <ComputerDesktopIcon className="h-5 w-5 text-secondary-500" />
              )}
              {app.platforms?.includes('mobile') && (
                <DevicePhoneMobileIcon className="h-5 w-5 text-secondary-500" />
              )}
            </div>
          </div>

          {/* Price and Purchase */}
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold text-primary-600">
              {app.price === 0 ? 'Free' : formatCurrency(app.price)}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAddToCart}
                disabled={isItemLoading(app.id)}
                className="px-6 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[44px] min-h-[44px]"
                aria-label={`Add ${app.name} to cart`}
              >
                {isItemLoading(app.id) && <LoadingSpinner size="sm" />}
                {isItemLoading(app.id) ? 'Adding...' : 'Add to Cart'}
              </button>
              <button
                onClick={handleBuyNow}
                disabled={isItemLoading(app.id)}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[44px] min-h-[44px]"
                aria-label={`${app.price === 0 ? 'Install' : 'Buy'} ${app.name} now`}
              >
                {isItemLoading(app.id) && <LoadingSpinner size="sm" />}
                {isItemLoading(app.id) 
                  ? 'Processing...' 
                  : (app.price === 0 ? 'Install Now' : 'Buy Now')
                }
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Screenshots */}
      {app.screenshots && app.screenshots.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-secondary-900 mb-4">Screenshots</h2>
          <div className="relative">
            <div className="aspect-video bg-secondary-100 rounded-lg overflow-hidden">
              <img
                src={app.screenshots[currentImageIndex]}
                alt={`Screenshot ${currentImageIndex + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
            {app.screenshots.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
          <div className="flex gap-2 mt-4 overflow-x-auto">
            {app.screenshots.map((screenshot: string, index: number) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={cn(
                  'flex-shrink-0 w-20 h-12 rounded border-2 overflow-hidden',
                  index === currentImageIndex ? 'border-primary-500' : 'border-secondary-300'
                )}
              >
                <img
                  src={screenshot}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-secondary-900 mb-4">About this app</h2>
        <div className="prose max-w-none text-secondary-700">
          <p>{app.description}</p>
        </div>
      </div>

      {/* Features */}
      {app.features && app.features.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-secondary-900 mb-4">Features</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {app.features.map((feature: string, index: number) => (
              <li key={index} className="flex items-center gap-2">
                <ShieldCheckIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-secondary-700">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Reviews */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-secondary-900">Reviews</h2>
          <button
            onClick={() => setShowReviewModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Write a Review
          </button>
        </div>

        {/* Review Summary */}
        <div className="bg-secondary-50 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-secondary-900">{app.rating}</div>
              <div className="flex items-center justify-center mt-1">
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
              <div className="text-sm text-secondary-600 mt-1">
                {app.reviewCount} reviews
              </div>
            </div>
            <div className="flex-1">
              {[5, 4, 3, 2, 1].map((stars) => (
                <div key={stars} className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-secondary-600 w-8">{stars}</span>
                  <div className="flex-1 bg-secondary-200 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full"
                      style={{ width: `${(app.ratingDistribution?.[stars] || 0)}%` }}
                    />
                  </div>
                  <span className="text-sm text-secondary-600 w-8">
                    {app.ratingDistribution?.[stars] || 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Individual Reviews */}
        <div className="space-y-6">
          {app.reviews?.slice(0, 5).map((review: any) => (
            <div key={review.id} className="border-b border-secondary-200 pb-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 font-medium">
                    {review.user.name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-secondary-900">{review.user.name}</span>
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <StarIconSolid
                          key={i}
                          className={cn(
                            'h-4 w-4',
                            i < review.rating ? 'text-yellow-400' : 'text-secondary-300'
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-secondary-500">
                      {formatDate(review.createdAt)}
                    </span>
                  </div>
                  <p className="text-secondary-700">{review.comment}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="Write a Review"
      >
        <form onSubmit={handleSubmitReview} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Rating
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                  className="p-1"
                >
                  <StarIconSolid
                    className={cn(
                      'h-6 w-6',
                      star <= reviewForm.rating ? 'text-yellow-400' : 'text-secondary-300'
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="review-comment" className="block text-sm font-medium text-secondary-700 mb-2">
              Comment
            </label>
            <textarea
              id="review-comment"
              value={reviewForm.comment}
              onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="Share your experience with this app..."
              required
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowReviewModal(false)}
              className="flex-1 px-4 py-2 border border-secondary-300 text-secondary-700 rounded-lg hover:bg-secondary-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Submit Review
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default AppDetail