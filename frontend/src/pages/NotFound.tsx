import React from 'react'
import { Link } from 'react-router-dom'
import { HomeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-secondary-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          {/* 404 Illustration */}
          <div className="mx-auto w-32 h-32 mb-8">
            <svg
              className="w-full h-full text-primary-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>

          {/* Error Message */}
          <h1 className="text-6xl font-bold text-secondary-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-secondary-700 mb-4">
            Page Not Found
          </h2>
          <p className="text-secondary-600 mb-8 max-w-md mx-auto">
            Sorry, we couldn't find the page you're looking for. The page might have been moved, deleted, or you entered the wrong URL.
          </p>

          {/* Action Buttons */}
          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            <Link
              to="/"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors min-w-[44px] min-h-[44px]"
              aria-label="Return to homepage"
            >
              <HomeIcon className="h-5 w-5 mr-2" aria-hidden="true" />
              Go Home
            </Link>
            <Link
              to="/apps"
              className="inline-flex items-center px-6 py-3 border border-secondary-300 text-base font-medium rounded-md text-secondary-700 bg-white hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors min-w-[44px] min-h-[44px]"
              aria-label="Browse all available apps"
            >
              <MagnifyingGlassIcon className="h-5 w-5 mr-2" aria-hidden="true" />
              Browse Apps
            </Link>
          </div>

          {/* Popular Links */}
          <div className="mt-12">
            <h3 className="text-lg font-medium text-secondary-900 mb-4">
              Popular Pages
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
              <Link
                to="/apps?category=productivity"
                className="text-primary-600 hover:text-primary-500 text-sm font-medium"
              >
                Productivity Apps
              </Link>
              <Link
                to="/apps?category=games"
                className="text-primary-600 hover:text-primary-500 text-sm font-medium"
              >
                Games
              </Link>
              <Link
                to="/apps?category=business"
                className="text-primary-600 hover:text-primary-500 text-sm font-medium"
              >
                Business Tools
              </Link>
              <Link
                to="/apps?category=education"
                className="text-primary-600 hover:text-primary-500 text-sm font-medium"
              >
                Education
              </Link>
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-8 text-sm text-secondary-500">
            <p>
              If you believe this is an error, please{' '}
              <Link to="/contact" className="text-primary-600 hover:text-primary-500">
                contact our support team
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotFound