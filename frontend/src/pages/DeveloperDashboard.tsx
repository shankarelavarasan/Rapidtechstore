import React, { useState, useEffect } from 'react'
import {
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowUpIcon,
  UserGroupIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import { useAuthStore, useNotificationStore } from '../store'
import { cn, formatCurrency } from '../lib/utils'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Modal from '../components/ui/Modal'
import AnalyticsDashboard from '../components/demo/AnalyticsDashboard'
import RevenueDashboard from '../components/demo/RevenueDashboard'

interface DeveloperApp {
  id: string
  name: string
  description: string
  price: number
  category: string
  rating: number
  downloads: number
  revenue: number
  status: 'published' | 'draft' | 'review' | 'rejected'
  createdAt: string
  updatedAt: string
}

const DeveloperDashboard: React.FC = () => {
  const { user } = useAuthStore()
  const { addNotification } = useNotificationStore()
  
  const [activeTab, setActiveTab] = useState('overview')
  const [apps, setApps] = useState<DeveloperApp[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApp, setSelectedApp] = useState<DeveloperApp | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    // Load realistic developer data for investor presentation
    import('../data/mockData').then(() => {
      // Create mock apps data for developer dashboard
      const mockApps: DeveloperApp[] = [
        {
          id: '1',
          name: 'IntelliCode Pro',
          description: 'AI-powered code completion tool',
          price: 89.99,
          category: 'Development',
          rating: 4.9,
          downloads: 125000,
          revenue: 11248.75,
          status: 'published',
          createdAt: '2023-06-15',
          updatedAt: '2024-01-20'
        },
        {
          id: '2',
          name: 'DesignFlow Studio',
          description: 'Professional UI/UX design suite',
          price: 49.99,
          category: 'Design',
          rating: 4.8,
          downloads: 89000,
          revenue: 4449.11,
          status: 'published',
          createdAt: '2023-03-20',
          updatedAt: '2024-01-18'
        }
      ]
      setApps(mockApps)
      setLoading(false)
    })
  }, [])

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'apps', name: 'My Apps', icon: PlusIcon },
    { id: 'analytics', name: 'Analytics', icon: ChartBarIcon },
    { id: 'revenue', name: 'Revenue', icon: CurrencyDollarIcon }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'review':
        return 'bg-yellow-100 text-yellow-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleDeleteApp = async (app: DeveloperApp) => {
    setSelectedApp(app)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (selectedApp) {
      // Simulate delete API call
      setApps(prev => prev.filter(app => app.id !== selectedApp.id))
      addNotification({
        type: 'success',
        title: 'App deleted',
        message: `${selectedApp.name} has been deleted successfully.`
      })
      setShowDeleteModal(false)
      setSelectedApp(null)
    }
  }

  const totalRevenue = apps.reduce((sum, app) => sum + app.revenue, 0)
  const totalDownloads = apps.reduce((sum, app) => sum + app.downloads, 0)
  const averageRating = apps.length > 0 
    ? apps.reduce((sum, app) => sum + app.rating, 0) / apps.length 
    : 0

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-secondary-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-secondary-600">Total Revenue</p>
              <p className="text-2xl font-bold text-secondary-900">{formatCurrency(totalRevenue)}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <ArrowUpIcon className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600 ml-1">+12.5% from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-secondary-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserGroupIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-secondary-600">Total Downloads</p>
              <p className="text-2xl font-bold text-secondary-900">{totalDownloads.toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <ArrowUpIcon className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600 ml-1">+8.2% from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-secondary-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <StarIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-secondary-600">Average Rating</p>
              <p className="text-2xl font-bold text-secondary-900">{averageRating.toFixed(1)}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <ArrowUpIcon className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600 ml-1">+0.3 from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-secondary-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-secondary-600">Published Apps</p>
              <p className="text-2xl font-bold text-secondary-900">{apps.filter(app => app.status === 'published').length}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm text-secondary-600">of {apps.length} total apps</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border border-secondary-200">
        <div className="p-6 border-b border-secondary-200">
          <h3 className="text-lg font-semibold text-secondary-900">Recent Activity</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              <span className="text-secondary-900">Productivity Suite Pro received 5 new reviews</span>
              <span className="text-secondary-500 ml-auto">2 hours ago</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              <span className="text-secondary-900">Design Studio reached 1000 downloads</span>
              <span className="text-secondary-500 ml-auto">1 day ago</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
              <span className="text-secondary-900">Code Editor Plus update approved</span>
              <span className="text-secondary-500 ml-auto">3 days ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderAppsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-secondary-900">My Apps</h2>
        <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" />
          New App
        </button>
      </div>

      <div className="bg-white rounded-lg border border-secondary-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  App
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Downloads
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-secondary-200">
              {apps.map((app) => (
                <tr key={app.id} className="hover:bg-secondary-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-secondary-100 rounded-lg mr-4"></div>
                      <div>
                        <div className="text-sm font-medium text-secondary-900">{app.name}</div>
                        <div className="text-sm text-secondary-500">{app.category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                      getStatusColor(app.status)
                    )}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                    {app.downloads.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                    {formatCurrency(app.revenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <StarIcon className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="ml-1 text-sm text-secondary-900">{app.rating}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button className="text-primary-600 hover:text-primary-900">
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button className="text-secondary-600 hover:text-secondary-900">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteApp(app)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const renderAnalyticsTab = () => (
    <AnalyticsDashboard />
  )

  const renderRevenueTab = () => (
    <RevenueDashboard />
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab()
      case 'apps':
        return renderAppsTab()
      case 'analytics':
        return renderAnalyticsTab()
      case 'revenue':
        return renderRevenueTab()
      default:
        return renderOverviewTab()
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-900">Developer Dashboard</h1>
        <p className="text-secondary-600">Welcome back, {user?.name}!</p>
      </div>

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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete App"
      >
        <div className="space-y-4">
          <p className="text-secondary-600">
            Are you sure you want to delete "{selectedApp?.name}"? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 border border-secondary-300 text-secondary-700 rounded-lg hover:bg-secondary-50"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default DeveloperDashboard