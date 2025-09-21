import React, { useState, useEffect } from 'react'
import {
  CurrencyDollarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  BanknotesIcon,
  CreditCardIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { cn, formatCurrency, formatDate } from '../../lib/utils'

interface RevenueData {
  totalRevenue: number
  monthlyRevenue: number
  pendingPayouts: number
  completedPayouts: number
  revenueGrowth: number
  payoutGrowth: number
}

interface PayoutHistory {
  id: string
  amount: number
  date: string
  status: 'completed' | 'pending' | 'processing'
  method: 'bank' | 'paypal' | 'stripe'
}

interface RevenueByCategory {
  category: string
  revenue: number
  percentage: number
  growth: number
}

const RevenueDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [animatedRevenue, setAnimatedRevenue] = useState(0)

  // Mock revenue data
  const revenueData: RevenueData = {
    totalRevenue: 127450,
    monthlyRevenue: 32230,
    pendingPayouts: 8950,
    completedPayouts: 118500,
    revenueGrowth: 33.8,
    payoutGrowth: 28.5
  }

  const monthlyData = [
    { month: 'Aug 2023', revenue: 45000, payouts: 42750 },
    { month: 'Sep 2023', revenue: 52000, payouts: 49400 },
    { month: 'Oct 2023', revenue: 61000, payouts: 57950 },
    { month: 'Nov 2023', revenue: 78000, payouts: 74100 },
    { month: 'Dec 2023', revenue: 95000, payouts: 90250 },
    { month: 'Jan 2024', revenue: 127000, payouts: 120650 }
  ]

  const payoutHistory: PayoutHistory[] = [
    {
      id: 'payout_001',
      amount: 28500,
      date: '2024-01-25',
      status: 'completed',
      method: 'bank'
    },
    {
      id: 'payout_002',
      amount: 15200,
      date: '2024-01-20',
      status: 'completed',
      method: 'paypal'
    },
    {
      id: 'payout_003',
      amount: 8950,
      date: '2024-01-28',
      status: 'pending',
      method: 'stripe'
    },
    {
      id: 'payout_004',
      amount: 22100,
      date: '2024-01-15',
      status: 'completed',
      method: 'bank'
    }
  ]

  const revenueByCategory: RevenueByCategory[] = [
    { category: 'Development', revenue: 44650, percentage: 35.2, growth: 28.5 },
    { category: 'Business', revenue: 29420, percentage: 23.1, growth: 35.2 },
    { category: 'Design', revenue: 25230, percentage: 19.8, growth: 22.8 },
    { category: 'Productivity', revenue: 16830, percentage: 13.2, growth: 18.9 },
    { category: 'Security', revenue: 11090, percentage: 8.7, growth: 42.1 }
  ]

  // Animate revenue counter
  useEffect(() => {
    const duration = 2000
    const steps = 60
    const stepDuration = duration / steps

    let step = 0
    const timer = setInterval(() => {
      step++
      const progress = step / steps
      setAnimatedRevenue(Math.floor(revenueData.totalRevenue * progress))

      if (step >= steps) {
        clearInterval(timer)
        setAnimatedRevenue(revenueData.totalRevenue)
      }
    }, stepDuration)

    return () => clearInterval(timer)
  }, [])

  const getStatusIcon = (status: PayoutHistory['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />
      case 'processing':
        return <ArrowUpIcon className="h-5 w-5 text-blue-500" />
    }
  }

  const getMethodIcon = (method: PayoutHistory['method']) => {
    switch (method) {
      case 'bank':
        return <BanknotesIcon className="h-5 w-5 text-secondary-600" />
      case 'paypal':
        return <CreditCardIcon className="h-5 w-5 text-blue-600" />
      case 'stripe':
        return <CreditCardIcon className="h-5 w-5 text-purple-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-secondary-900">Revenue Dashboard</h2>
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

      {/* Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: 'Total Revenue',
            value: formatCurrency(animatedRevenue),
            growth: revenueData.revenueGrowth,
            icon: CurrencyDollarIcon,
            color: 'green'
          },
          {
            title: 'Monthly Revenue',
            value: formatCurrency(revenueData.monthlyRevenue),
            growth: 25.4,
            icon: ChartBarIcon,
            color: 'blue'
          },
          {
            title: 'Pending Payouts',
            value: formatCurrency(revenueData.pendingPayouts),
            growth: -12.3,
            icon: ClockIcon,
            color: 'yellow'
          },
          {
            title: 'Completed Payouts',
            value: formatCurrency(revenueData.completedPayouts),
            growth: revenueData.payoutGrowth,
            icon: CheckCircleIcon,
            color: 'green'
          }
        ].map((metric) => (
          <div
            key={metric.title}
            className="bg-white rounded-lg border border-secondary-200 p-6 hover:shadow-lg transition-shadow duration-200"
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
                metric.color === 'yellow' && 'bg-yellow-100'
              )}>
                <metric.icon className={cn(
                  'h-6 w-6',
                  metric.color === 'green' && 'text-green-600',
                  metric.color === 'blue' && 'text-blue-600',
                  metric.color === 'yellow' && 'text-yellow-600'
                )} />
              </div>
            </div>
            <div className="flex items-center mt-4">
              {metric.growth > 0 ? (
                <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className={cn(
                'text-sm font-medium mr-1',
                metric.growth > 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {metric.growth > 0 ? '+' : ''}{metric.growth}%
              </span>
              <span className="text-sm text-secondary-500">vs last month</span>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Chart and Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <div className="bg-white rounded-lg border border-secondary-200 p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">Monthly Revenue Trend</h3>
          <div className="h-64 flex items-end space-x-3 p-4 bg-secondary-50 rounded-lg">
            {monthlyData.map((data, index) => {
              const maxRevenue = Math.max(...monthlyData.map(d => d.revenue))
              const height = (data.revenue / maxRevenue) * 200
              
              return (
                <div key={data.month} className="flex-1 flex flex-col items-center">
                  <div className="w-full space-y-1">
                    <div
                      className="w-full bg-green-500 rounded-t-lg transition-all duration-1000 ease-out"
                      style={{ 
                        height: `${height}px`,
                        animationDelay: `${index * 100}ms`
                      }}
                    />
                  </div>
                  <span className="text-xs text-secondary-600 mt-2 font-medium">
                    {data.month.split(' ')[0]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Revenue by Category */}
        <div className="bg-white rounded-lg border border-secondary-200 p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">Revenue by Category</h3>
          <div className="space-y-4">
            {revenueByCategory.map((category, index) => (
              <div key={category.category} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-secondary-900">{category.category}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-secondary-600">
                      {formatCurrency(category.revenue)}
                    </span>
                    <span className="text-xs text-green-600 font-medium">
                      +{category.growth}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-secondary-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-1000 ease-out"
                    style={{ 
                      width: `${category.percentage}%`,
                      animationDelay: `${index * 150}ms`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payout History */}
      <div className="bg-white rounded-lg border border-secondary-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-secondary-900">Recent Payouts</h3>
          <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            View All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-secondary-200">
                <th className="text-left py-3 px-4 font-medium text-secondary-600">Date</th>
                <th className="text-left py-3 px-4 font-medium text-secondary-600">Amount</th>
                <th className="text-left py-3 px-4 font-medium text-secondary-600">Method</th>
                <th className="text-left py-3 px-4 font-medium text-secondary-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {payoutHistory.map((payout) => (
                <tr key={payout.id} className="border-b border-secondary-100 hover:bg-secondary-50">
                  <td className="py-3 px-4 text-secondary-600">
                    {formatDate(payout.date)}
                  </td>
                  <td className="py-3 px-4 font-medium text-secondary-900">
                    {formatCurrency(payout.amount)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      {getMethodIcon(payout.method)}
                      <span className="text-secondary-600 capitalize">{payout.method}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(payout.status)}
                      <span className={cn(
                        'text-sm font-medium capitalize',
                        payout.status === 'completed' && 'text-green-600',
                        payout.status === 'pending' && 'text-yellow-600',
                        payout.status === 'processing' && 'text-blue-600'
                      )}>
                        {payout.status}
                      </span>
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

export default RevenueDashboard