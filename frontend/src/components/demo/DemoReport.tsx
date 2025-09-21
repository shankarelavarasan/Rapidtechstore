import React, { useState } from 'react'
import { 
  DocumentArrowDownIcon, 
  ChartBarIcon, 
  CurrencyDollarIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  DevicePhoneMobileIcon,

  GlobeAltIcon
} from '@heroicons/react/24/outline'
import { cn } from '../../lib/utils'

interface DemoReportProps {
  className?: string
}

const DemoReport: React.FC<DemoReportProps> = ({ className }) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportType, setReportType] = useState<'analytics' | 'revenue' | 'full'>('full')

  // Mock data for the report
  const reportData = {
    analytics: {
      totalUsers: 2847392,
      monthlyGrowth: 23.5,
      topApps: [
        { name: 'PhotoEditor Pro', downloads: 45230, revenue: 89450 },
        { name: 'TaskMaster', downloads: 38920, revenue: 67340 },
        { name: 'FitnessTracker', downloads: 32150, revenue: 54280 }
      ],
      platformBreakdown: {
        mobile: 68,
        desktop: 22,
        web: 10
      }
    },
    revenue: {
      totalRevenue: 1247830,
      monthlyRevenue: 156780,
      revenueGrowth: 18.7,
      topCategories: [
        { name: 'Productivity', revenue: 423560, percentage: 34 },
        { name: 'Entertainment', revenue: 312340, percentage: 25 },
        { name: 'Health & Fitness', revenue: 187450, percentage: 15 }
      ]
    },
    projections: {
      nextQuarter: 2.1,
      nextYear: 8.5,
      marketPotential: 45.2
    }
  }

  const generateReport = async () => {
    setIsGenerating(true)
    
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Create report content
    const reportContent = createReportContent()
    
    // Create and download file
    const blob = new Blob([reportContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `rapid-tech-store-${reportType}-report-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    setIsGenerating(false)
  }

  const createReportContent = () => {
    const date = new Date().toLocaleDateString()
    
    return `RAPID TECH STORE - DEMO REPORT
Generated: ${date}
Report Type: ${reportType.toUpperCase()}

===============================================
EXECUTIVE SUMMARY
===============================================

Rapid Tech Store represents a revolutionary approach to app distribution,
combining cutting-edge technology with user-centric design to create
an unparalleled marketplace experience.

===============================================
KEY METRICS & ANALYTICS
===============================================

Total Platform Users: ${reportData.analytics.totalUsers.toLocaleString()}
Monthly Growth Rate: ${reportData.analytics.monthlyGrowth}%
Platform Distribution:
  • Mobile: ${reportData.analytics.platformBreakdown.mobile}%
  • Desktop: ${reportData.analytics.platformBreakdown.desktop}%
  • Web: ${reportData.analytics.platformBreakdown.web}%

Top Performing Applications:
${reportData.analytics.topApps.map((app, index) => 
  `${index + 1}. ${app.name}
     Downloads: ${app.downloads.toLocaleString()}
     Revenue: $${app.revenue.toLocaleString()}`
).join('\n')}

===============================================
REVENUE ANALYSIS
===============================================

Total Revenue: $${reportData.revenue.totalRevenue.toLocaleString()}
Monthly Recurring Revenue: $${reportData.revenue.monthlyRevenue.toLocaleString()}
Revenue Growth Rate: ${reportData.revenue.revenueGrowth}%

Revenue by Category:
${reportData.revenue.topCategories.map(cat => 
  `• ${cat.name}: $${cat.revenue.toLocaleString()} (${cat.percentage}%)`
).join('\n')}

===============================================
MARKET PROJECTIONS
===============================================

Next Quarter Growth: ${reportData.projections.nextQuarter}M users
Annual Projection: ${reportData.projections.nextYear}M users
Total Market Potential: $${reportData.projections.marketPotential}M

===============================================
CONTACT INFORMATION
===============================================

For more information about investment opportunities:
Email: investors@rapidtechstore.com
Phone: +1 (555) 123-4567
Website: www.rapidtechstore.com`.trim()
  }

  return (
    <div className={cn("bg-white rounded-xl shadow-lg border border-secondary-200 p-6", className)}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-secondary-900 mb-2">
            Demo Report Generator
          </h3>
          <p className="text-secondary-600">
            Generate comprehensive analytics and revenue reports for investors
          </p>
        </div>
        <DocumentArrowDownIcon className="h-8 w-8 text-primary-600" />
      </div>

      {/* Report Type Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-secondary-700 mb-3">
          Report Type
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => setReportType('analytics')}
            className={cn(
              "p-4 rounded-lg border-2 transition-all duration-200 text-left",
              reportType === 'analytics'
                ? "border-primary-500 bg-primary-50"
                : "border-secondary-200 hover:border-secondary-300"
            )}
          >
            <ChartBarIcon className="h-6 w-6 text-primary-600 mb-2" />
            <div className="font-medium text-secondary-900">Analytics Only</div>
            <div className="text-sm text-secondary-600">User metrics & engagement</div>
          </button>
          
          <button
            onClick={() => setReportType('revenue')}
            className={cn(
              "p-4 rounded-lg border-2 transition-all duration-200 text-left",
              reportType === 'revenue'
                ? "border-primary-500 bg-primary-50"
                : "border-secondary-200 hover:border-secondary-300"
            )}
          >
            <CurrencyDollarIcon className="h-6 w-6 text-primary-600 mb-2" />
            <div className="font-medium text-secondary-900">Revenue Only</div>
            <div className="text-sm text-secondary-600">Financial performance</div>
          </button>
          
          <button
            onClick={() => setReportType('full')}
            className={cn(
              "p-4 rounded-lg border-2 transition-all duration-200 text-left",
              reportType === 'full'
                ? "border-primary-500 bg-primary-50"
                : "border-secondary-200 hover:border-secondary-300"
            )}
          >
            <GlobeAltIcon className="h-6 w-6 text-primary-600 mb-2" />
            <div className="font-medium text-secondary-900">Complete Report</div>
            <div className="text-sm text-secondary-600">Full analysis & projections</div>
          </button>
        </div>
      </div>

      {/* Report Preview */}
      <div className="bg-secondary-50 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-secondary-900 mb-3">Report Preview</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-4 w-4 text-secondary-500" />
            <span className="text-secondary-600">
              {new Date().toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
            <span className="text-secondary-600">
              {reportData.analytics.monthlyGrowth}% Growth
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <DevicePhoneMobileIcon className="h-4 w-4 text-blue-500" />
            <span className="text-secondary-600">
              {reportData.analytics.totalUsers.toLocaleString()} Users
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <CurrencyDollarIcon className="h-4 w-4 text-green-500" />
            <span className="text-secondary-600">
              ${reportData.revenue.totalRevenue.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={generateReport}
        disabled={isGenerating}
        className={cn(
          "w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200",
          isGenerating
            ? "bg-secondary-100 text-secondary-400 cursor-not-allowed"
            : "bg-primary-600 hover:bg-primary-700 text-white shadow-lg hover:shadow-xl"
        )}
      >
        <DocumentArrowDownIcon className="h-5 w-5" />
        <span>
          {isGenerating ? 'Generating Report...' : 'Download Demo Report'}
        </span>
      </button>

      {/* Additional Info */}
      <div className="mt-4 text-xs text-secondary-500 text-center">
        Report includes analytics, revenue data, market projections, and investment highlights
      </div>
    </div>
  )
}

export default DemoReport