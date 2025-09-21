import React, { useState, useEffect } from 'react'
import { 
  UserIcon, 
  ShoppingBagIcon, 
  HeartIcon,
  BellIcon,
  KeyIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline'
import { useAuthStore, useNotificationStore } from '../store'
import { cn, formatCurrency, formatDate } from '../lib/utils'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import type { Purchase } from '../data/mockData'

const Profile: React.FC = () => {
  const { user, updateProfile, isLoading } = useAuthStore()
  const { addNotification } = useNotificationStore()
  
  const [activeTab, setActiveTab] = useState('profile')
  const [isEditing, setIsEditing] = useState(false)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    username: user?.username || ''
  })

  useEffect(() => {
    // Load realistic purchase history for investor presentation
    import('../data/mockData').then(({ mockPurchases }) => {
      setPurchases(mockPurchases)
    })
  }, [])

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserIcon },
    { id: 'purchases', name: 'Purchases', icon: ShoppingBagIcon },
    { id: 'favorites', name: 'Favorites', icon: HeartIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'security', name: 'Security', icon: KeyIcon },
    { id: 'billing', name: 'Billing', icon: CreditCardIcon }
  ]

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSaveProfile = async () => {
    try {
      await updateProfile(formData)
      setIsEditing(false)
      addNotification({
        type: 'success',
        title: 'Profile updated',
        message: 'Your profile has been successfully updated.'
      })
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Update failed',
        message: 'Failed to update profile. Please try again.'
      })
    }
  }

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-secondary-900">Profile Information</h2>
        <button
          onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
          disabled={isLoading}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
        >
          {isLoading ? <LoadingSpinner size="sm" /> : (isEditing ? 'Save Changes' : 'Edit Profile')}
        </button>
      </div>

      <div className="bg-white rounded-lg border border-secondary-200 p-6">
        <div className="flex items-center mb-6">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-600">
              {user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="ml-6">
            <h3 className="text-xl font-semibold text-secondary-900">
              {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.username}
            </h3>
            <p className="text-secondary-600">{user?.email}</p>
            <p className="text-sm text-secondary-500">Member since {user?.createdAt ? formatDate(user.createdAt) : 'Unknown'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="profile-firstName" className="block text-sm font-medium text-secondary-700 mb-2">
              First Name
            </label>
            <input
              id="profile-firstName"
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              disabled={!isEditing}
              className={cn(
                'w-full px-3 py-2 border rounded-md',
                isEditing 
                  ? 'border-secondary-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500' 
                  : 'border-secondary-200 bg-secondary-50'
              )}
            />
          </div>

          <div>
            <label htmlFor="profile-lastName" className="block text-sm font-medium text-secondary-700 mb-2">
              Last Name
            </label>
            <input
              id="profile-lastName"
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              disabled={!isEditing}
              className={cn(
                'w-full px-3 py-2 border rounded-md',
                isEditing 
                  ? 'border-secondary-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500' 
                  : 'border-secondary-200 bg-secondary-50'
              )}
            />
          </div>

          <div>
            <label htmlFor="profile-username" className="block text-sm font-medium text-secondary-700 mb-2">
              Username
            </label>
            <input
              id="profile-username"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              disabled={!isEditing}
              className={cn(
                'w-full px-3 py-2 border rounded-md',
                isEditing 
                  ? 'border-secondary-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500' 
                  : 'border-secondary-200 bg-secondary-50'
              )}
            />
          </div>

          <div>
            <label htmlFor="profile-email" className="block text-sm font-medium text-secondary-700 mb-2">
              Email
            </label>
            <input
              id="profile-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              disabled={!isEditing}
              className={cn(
                'w-full px-3 py-2 border rounded-md',
                isEditing 
                  ? 'border-secondary-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500' 
                  : 'border-secondary-200 bg-secondary-50'
              )}
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderPurchasesTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-secondary-900">Purchase History</h2>
      
      <div className="bg-white rounded-lg border border-secondary-200">
        <div className="p-6 border-b border-secondary-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-secondary-900">Recent Purchases</h3>
              <p className="text-secondary-600">Your app purchase history</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary-600">$127.96</div>
              <div className="text-sm text-secondary-500">Total spent</div>
            </div>
          </div>
        </div>

        <div className="divide-y divide-secondary-200">
          {purchases.map((purchase) => (
            <div key={purchase.id} className="p-6 flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-secondary-100 rounded-lg mr-4"></div>
                <div>
                  <h4 className="font-medium text-secondary-900">{purchase.appName}</h4>
                  <p className="text-sm text-secondary-600">by {purchase.developer}</p>
                  <p className="text-sm text-secondary-500">{formatDate(purchase.purchaseDate)}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-secondary-900">{formatCurrency(purchase.price)}</div>
                <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                  {purchase.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderFavoritesTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-secondary-900">Favorite Apps</h2>
      
      <div className="bg-white rounded-lg border border-secondary-200 p-6">
        <div className="text-center py-12">
          <HeartIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-secondary-900 mb-2">No favorites yet</h3>
          <p className="text-secondary-600">
            Start exploring apps and add them to your favorites to see them here.
          </p>
        </div>
      </div>
    </div>
  )

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-secondary-900">Notification Settings</h2>
      
      <div className="bg-white rounded-lg border border-secondary-200 p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-secondary-900">Email Notifications</h3>
              <p className="text-secondary-600">Receive updates about your account and purchases</p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-secondary-900">App Updates</h3>
              <p className="text-secondary-600">Get notified when your apps have updates</p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-secondary-900">Marketing</h3>
              <p className="text-secondary-600">Receive news about new apps and promotions</p>
            </div>
            <input
              type="checkbox"
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-secondary-900">Security Settings</h2>
      
      <div className="bg-white rounded-lg border border-secondary-200 p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-secondary-900 mb-4">Change Password</h3>
            <div className="space-y-4">
              <input
                type="password"
                placeholder="Current password"
                className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
              <input
                type="password"
                placeholder="New password"
                className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
              <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                Update Password
              </button>
            </div>
          </div>
          
          <div className="border-t border-secondary-200 pt-6">
            <h3 className="text-lg font-medium text-secondary-900 mb-4">Two-Factor Authentication</h3>
            <p className="text-secondary-600 mb-4">
              Add an extra layer of security to your account
            </p>
            <button className="px-4 py-2 border border-secondary-300 text-secondary-700 rounded-lg hover:bg-secondary-50">
              Enable 2FA
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderBillingTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-secondary-900">Billing Information</h2>
      
      <div className="bg-white rounded-lg border border-secondary-200 p-6">
        <div className="text-center py-12">
          <CreditCardIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-secondary-900 mb-2">No payment methods</h3>
          <p className="text-secondary-600 mb-4">
            Add a payment method to make purchases easier.
          </p>
          <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            Add Payment Method
          </button>
        </div>
      </div>
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab()
      case 'purchases':
        return renderPurchasesTab()
      case 'favorites':
        return renderFavoritesTab()
      case 'notifications':
        return renderNotificationsTab()
      case 'security':
        return renderSecurityTab()
      case 'billing':
        return renderBillingTab()
      default:
        return renderProfileTab()
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    activeTab === tab.id
                      ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-500'
                      : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-50'
                  )}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}

export default Profile