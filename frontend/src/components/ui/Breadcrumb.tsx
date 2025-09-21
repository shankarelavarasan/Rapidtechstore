import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline'
import { cn } from '../../lib/utils'

interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[]
  className?: string
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className }) => {
  const location = useLocation()
  
  // Auto-generate breadcrumbs based on current path if items not provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', href: '/' }
    ]

    // Map common routes to user-friendly labels
    const routeLabels: Record<string, string> = {
      'apps': 'Apps',
      'categories': 'Categories',
      'developer-dashboard': 'Developer Dashboard',
      'profile': 'Profile',
      'checkout': 'Checkout',
      'auth': 'Authentication',
      'login': 'Login',
      'register': 'Register',
      'ai-search': 'AI Search',
      'demo': 'Demo',
      'investor': 'Investor Demo'
    }

    let currentPath = ''
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`
      const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
      const isLast = index === pathSegments.length - 1
      
      breadcrumbs.push({
        label,
        href: isLast ? undefined : currentPath,
        current: isLast
      })
    })

    return breadcrumbs
  }

  const breadcrumbItems = items || generateBreadcrumbs()

  if (breadcrumbItems.length <= 1) {
    return null
  }

  return (
    <nav 
      className={cn('flex items-center space-x-2 text-sm', className)}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center space-x-2">
        {breadcrumbItems.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRightIcon className="h-4 w-4 text-secondary-400 mx-2" />
            )}
            
            {item.current ? (
              <span className="text-secondary-900 font-medium" aria-current="page">
                {item.label}
              </span>
            ) : item.href ? (
              <Link
                to={item.href}
                className="text-secondary-600 hover:text-secondary-900 transition-colors duration-200 flex items-center"
              >
                {index === 0 && (
                  <HomeIcon className="h-4 w-4 mr-1" />
                )}
                {item.label}
              </Link>
            ) : (
              <span className="text-secondary-600">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export default Breadcrumb