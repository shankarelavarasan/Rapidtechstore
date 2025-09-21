import React, { useState, useEffect } from 'react'
import {

  ArrowUpIcon,
  ArrowDownIcon,

  CurrencyDollarIcon,
  UserGroupIcon,
  StarIcon,

  DevicePhoneMobileIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline'
import { cn, formatCurrency } from '../../lib/utils'

interface AnalyticsData {
  revenue: { current: number; previous: number; growth: number }
  downloads: { current: number; previous: number; growth: number }
  rating: { current: number; previous: number; growth: number }
  users: { current: number; previous: number; growth: number }
}

interface ChartData {
  month: string
  revenue: number
  downloads: number
  users: number
}

const AnalyticsDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [activeChart, setActiveChart] = useState<'revenue' | 'downloads' | 'users'>('revenue')
  const [animatedValues, setAnimatedValues] = useState({
    revenue: 0,
    downloads: 0,
    rating: 0,
    users: 0
  })

  // Mock real-time data
  const analyticsData: AnalyticsData = {
    revenue: { current: 127450, previous: 95230, growth: 33.8 },
    downloads: { current: 28900, previous: 22100, growth: 30.8 },
    rating: { current: 4.8, previous: 4.6, growth: 4.3 },
    users: { current: 15600, previous: 12400, growth: 25.8 }
  }

  const chartData: ChartData[] = [
    { month: 'Aug', revenue: 45000, downloads: 12000, users: 8500 },
    { month: 'Sep', revenue: 52000, downloads: 14500, users: 9800 },
    { month: 'Oct', revenue: 61000, downloads: 16800, users: 11200 },
    { month: 'Nov', revenue: 78000, downloads: 19200, users: 12400 },
    { month: 'Dec', revenue: 95000, downloads: 22100, users: 13800 },
    { month: 'Jan', revenue: 127000, downloads: 28900, users: 15600 }
  ]

  const topApps = [
    { name: 'IntelliCode Pro', revenue: 45200, downloads: 8900, rating: 4.9 },
    { name: 'DesignFlow Studio', revenue: 32100, downloads: 6700, rating: 4.8 },
    { name: 'DataViz Analytics', revenue: 28900, downloads: 4200, rating: 4.7 },
    { name: 'SecureVault Pro', revenue: 21250, downloads: 9100, rating: 4.9 }
  ]

  const platformBreakdown = [
    { platform: 'Windows', percentage: 45.2, users: 7056, icon: ComputerDesktopIcon },
    { platform: 'macOS', percentage: 28.7, users: 4477, icon: ComputerDesktopIcon },
    { platform: 'Linux', percentage: 15.6, users: 2434, icon: ComputerDesktopIcon },
    { platform: 'Mobile', percentage: 10.5, users: 1638, icon: DevicePhoneMobileIcon }
  ]

  // Animate numbers on mount
  useEffect(() => {
    const duration = 2000
    const steps = 60
    const stepDuration = duration / steps

    let step = 0
    const timer = setInterval(() => {
      step++
      const progress = step / steps

      setAnimatedValues({
        revenue: Math.floor(analyticsData.revenue.current * progress),
        downloads: Math.floor(analyticsData.downloads.current * progress),
        rating: Math.floor(analyticsData.rating.current * progress * 10) / 10,
        users: Math.floor(analyticsData.users.current * progress)
      })

      if (step >= steps) {
        clearInterval(timer)
        setAnimatedValues({
          revenue: analyticsData.revenue.current,
          downloads: analyticsData.downloads.current,
          rating: analyticsData.rating.current,
          users: analyticsData.users.current
        })
      }
    }, stepDuration)

    return () => clearInterval(timer)
  }, [])

  const getMaxValue = (key: keyof ChartData) => {
    return Math.max(...chartData.map(item => item[key] as number))
  }

  const renderChart = () => {
    const maxValue = getMaxValue(activeChart)
    
    return (
      <div className="space-y-4">
        <div className="flex space-x-2">
          {['revenue', 'downloads', 'users'].map((chart) => (
            <button
              key={chart}
              onClick={() => setActiveChart(chart as any)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                activeChart === chart
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
              )}
            >
              {chart.charAt(0).toUpperCase() + chart.slice(1)}
            </button>
          ))}
        </div>
        
        <div className="h-64 flex items-end space-x-4 p-4 bg-secondary-50 rounded-lg">
          {chartData.map((data, index) => {
            const value = data[activeChart] as number
            const height = (value / maxValue) * 200
            
            return (
              <div key={data.month} className="flex-1 flex flex-col items-center">
                <div
                  className={cn(
                    'w-full rounded-t-lg transition-all duration-1000 ease-out',
                    activeChart === 'revenue' && 'bg-green-500',
                    activeChart === 'downloads' && 'bg-blue-500',
                    activeChart === 'users' && 'bg-purple-500'
                  )}
                  style={{ 
                    height: `${height}px`,
                    animationDelay: `${index * 100}ms`
                  }}
                />
                <span className="text-xs text-secondary-600 mt-2 font-medium">
                  {data.month}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-secondary-900">Analytics Dashboard</h2>
        <div className="flex space-x-2">
          {(['7d', '30d', '90d', '1y'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                timeRange === range
                  ? 'bg-primary-600 text-white'
                  : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: 'Total Revenue',
            value: formatCurrency(animatedValues.revenue),
            growth: analyticsData.revenue.growth,
            icon: CurrencyDollarIcon,
            color: 'green'
          },
          {
            title: 'Downloads',
            value: animatedValues.downloads.toLocaleString(),
            growth: analyticsData.downloads.growth,
            icon: ArrowDownIcon,
            color: 'blue'
          },
          {
            title: 'Average Rating',
            value: animatedValues.rating.toFixed(1),
            growth: analyticsData.rating.growth,
            icon: StarIcon,
            color: 'yellow'
          },
          {
            title: 'Active Users',
            value: animatedValues.users.toLocaleString(),
            growth: analyticsData.users.growth,
            icon: UserGroupIcon,
            color: 'purple'
          }
        ].map((metric, index) => (
          <div
            key={metric.title}
            className="bg-white rounded-lg border border-secondary-200 p-6 hover:shadow-lg transition-shadow duration-200"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-600">{metric.title}</p>
                <p className="text-2xl font-bold text-secondary-900 mt-1">{metric.value}</p>
              </div>
              <div className={cn(
                'p-3 rounded-lg',
                metric.color === 'green' && 'bg-green-100',
                metric.color === 'blue' && 'bg-blue-100',
                metric.color === 'yellow' && 'bg-yellow-100',
                metric.color === 'purple' && 'bg-purple-100'
              )}>
                <metric.icon className={cn(
                  'h-6 w-6',
                  metric.color === 'green' && 'text-green-600',
                  metric.color === 'blue' && 'text-blue-600',
                  metric.color === 'yellow' && 'text-yellow-600',
                  metric.color === 'purple' && 'text-purple-600'
                )} />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm font-medium text-green-600">
                +{metric.growth}%
              </span>
              <span className="text-sm text-secondary-500 ml-1">vs last month</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <div className="bg-white rounded-lg border border-secondary-200 p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">Performance Trends</h3>
          {renderChart()}
        </div>

        {/* Platform Breakdown */}
        <div className="bg-white rounded-lg border border-secondary-200 p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">Platform Distribution</h3>
          <div className="space-y-4">
            {platformBreakdown.map((platform, index) => (
              <div key={platform.platform} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <platform.icon className="h-5 w-5 text-secondary-600" />
                  <span className="font-medium text-secondary-900">{platform.platform}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-24 bg-secondary-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${platform.percentage}%`,
                        animationDelay: `${index * 200}ms`
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-secondary-600 w-12">
                    {platform.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Performing Apps */}
      <div className="bg-white rounded-lg border border-secondary-200 p-6">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Top Performing Apps</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-secondary-200">
                <th className="text-left py-3 px-4 font-medium text-secondary-600">App Name</th>
                <th className="text-left py-3 px-4 font-medium text-secondary-600">Revenue</th>
                <th className="text-left py-3 px-4 font-medium text-secondary-600">Downloads</th>
                <th className="text-left py-3 px-4 font-medium text-secondary-600">Rating</th>
              </tr>
            </thead>
            <tbody>
              {topApps.map((app) => (
                <tr key={app.name} className="border-b border-secondary-100 hover:bg-secondary-50">
                  <td className="py-3 px-4 font-medium text-secondary-900">{app.name}</td>
                  <td className="py-3 px-4 text-secondary-600">{formatCurrency(app.revenue)}</td>
                  <td className="py-3 px-4 text-secondary-600">{app.downloads.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-1">
                      <StarIcon className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-secondary-600">{app.rating}</span>
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
}

export default AnalyticsDashboard