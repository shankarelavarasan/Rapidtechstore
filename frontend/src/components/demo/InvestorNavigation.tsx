import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  HomeIcon,
  ChartBarIcon,

  UserGroupIcon,
  CogIcon,
  PlayIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { cn } from '../../lib/utils'

interface DemoStep {
  id: string
  title: string
  description: string
  path: string
  icon: React.ComponentType<any>
  completed?: boolean
  duration?: string
}

interface InvestorNavigationProps {
  className?: string
  showProgress?: boolean
}

const InvestorNavigation: React.FC<InvestorNavigationProps> = ({ 
  className, 
  showProgress = true 
}) => {
  const location = useLocation()


  const demoSteps: DemoStep[] = [
    {
      id: 'overview',
      title: 'Platform Overview',
      description: 'Explore the marketplace and key features',
      path: '/',
      icon: HomeIcon,
      duration: '2 min'
    },
    {
      id: 'apps',
      title: 'App Discovery',
      description: 'Browse apps and categories',
      path: '/apps',
      icon: CogIcon,
      duration: '3 min'
    },
    {
      id: 'ai-search',
      title: 'AI-Powered Search',
      description: 'Experience intelligent app discovery',
      path: '/ai-search',
      icon: ChartBarIcon,
      duration: '2 min'
    },
    {
      id: 'developer-dashboard',
      title: 'Developer Analytics',
      description: 'View comprehensive analytics and revenue data',
      path: '/developer-dashboard',
      icon: ChartBarIcon,
      duration: '4 min'
    },
    {
      id: 'categories',
      title: 'Market Categories',
      description: 'Explore different market segments',
      path: '/categories',
      icon: UserGroupIcon,
      duration: '2 min'
    }
  ]

  // Determine current step based on location
  const getCurrentStep = () => {
    return demoSteps.findIndex(step => step.path === location.pathname) || 0
  }

  const currentStep = getCurrentStep()
  const nextStep = demoSteps[currentStep + 1]
  const prevStep = demoSteps[currentStep - 1]

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStep) return 'completed'
    if (stepIndex === currentStep) return 'current'
    return 'upcoming'
  }

  return (
    <div className={cn('bg-white border-b border-secondary-200', className)}>
      {/* Demo Progress Header */}
      {showProgress && (
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <PlayIcon className="h-5 w-5" />
                <span className="font-medium">Investor Demo Walkthrough</span>
                <span className="text-primary-200">
                  Step {currentStep + 1} of {demoSteps.length}
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-primary-200">
                  Progress: {Math.round(((currentStep + 1) / demoSteps.length) * 100)}%
                </div>
                <div className="w-32 bg-primary-800 rounded-full h-2">
                  <div
                    className="bg-white h-2 rounded-full transition-all duration-500"
                    style={{ width: `${((currentStep + 1) / demoSteps.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Steps */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Steps List */}
          <div className="flex items-center space-x-6 overflow-x-auto">
            {demoSteps.map((step, index) => {
              const status = getStepStatus(index)
              const Icon = step.icon
              
              return (
                <Link
                  key={step.id}
                  to={step.path}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 whitespace-nowrap',
                    status === 'current' && 'bg-primary-100 text-primary-700 ring-2 ring-primary-500',
                    status === 'completed' && 'bg-green-100 text-green-700 hover:bg-green-200',
                    status === 'upcoming' && 'text-secondary-600 hover:bg-secondary-100'
                  )}
                >
                  <div className={cn(
                    'flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium',
                    status === 'current' && 'bg-primary-600 text-white',
                    status === 'completed' && 'bg-green-600 text-white',
                    status === 'upcoming' && 'bg-secondary-300 text-secondary-600'
                  )}>
                    {status === 'completed' ? (
                      <CheckCircleIcon className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-sm font-medium">{step.title}</div>
                    <div className="text-xs opacity-75">{step.duration}</div>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center space-x-2 ml-6">
            {prevStep && (
              <Link
                to={prevStep.path}
                className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Previous</span>
              </Link>
            )}
            
            {nextStep && (
              <Link
                to={nextStep.path}
                className="flex items-center space-x-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
              >
                <span>Next</span>
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            )}
            
            {!nextStep && (
              <div className="flex items-center space-x-1 px-4 py-2 text-sm font-medium text-green-600 bg-green-100 rounded-lg">
                <CheckCircleIcon className="h-4 w-4" />
                <span>Demo Complete</span>
              </div>
            )}
          </div>
        </div>

        {/* Current Step Info */}
        <div className="mt-4 p-4 bg-secondary-50 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {React.createElement(demoSteps[currentStep].icon, { className: "h-6 w-6 text-primary-600" })}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-secondary-900">
                {demoSteps[currentStep].title}
              </h3>
              <p className="text-secondary-600 mt-1">
                {demoSteps[currentStep].description}
              </p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-secondary-500">
                <span>Duration: {demoSteps[currentStep].duration}</span>
                <span>•</span>
                <span>Step {currentStep + 1} of {demoSteps.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InvestorNavigation