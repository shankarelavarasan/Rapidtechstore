import React from 'react'
import { Link } from 'react-router-dom'
import { Dialog, Transition } from '@headlessui/react'
import { 
  XMarkIcon,
  HomeIcon,
  RectangleStackIcon,
  StarIcon,
  UserIcon,
  Cog6ToothIcon,
  HeartIcon,
  ShoppingCartIcon,
  BellIcon
} from '@heroicons/react/24/outline'
import { useUIStore, useAuthStore } from '../../store'


const MobileMenu: React.FC = () => {
  const { mobileMenuOpen, toggleMobileMenu } = useUIStore()
  const { user, isAuthenticated, logout } = useAuthStore()

  const navigationItems = [
    { name: 'Home', href: '/', icon: HomeIcon },
    { name: 'Browse Apps', href: '/apps', icon: RectangleStackIcon },
    { name: 'Featured', href: '/featured', icon: StarIcon },
    { name: 'Categories', href: '/categories', icon: RectangleStackIcon },
  ]

  const userItems = isAuthenticated ? [
    { name: 'Profile', href: '/profile', icon: UserIcon },
    { name: 'Favorites', href: '/favorites', icon: HeartIcon },
    { name: 'My Purchases', href: '/purchases', icon: ShoppingCartIcon },
    { name: 'Notifications', href: '/notifications', icon: BellIcon },
    { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
  ] : []

  const handleLinkClick = () => {
    toggleMobileMenu()
  }

  const handleLogout = () => {
    logout()
    toggleMobileMenu()
  }

  return (
    <Transition show={mobileMenuOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={toggleMobileMenu}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 left-0 flex max-w-full">
              <Transition.Child
                as={React.Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto relative w-screen max-w-sm">
                  <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-6 bg-gradient-to-r from-primary-500 to-accent-500">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-sm">RT</span>
                        </div>
                        <span className="text-white font-semibold">Menu</span>
                      </div>
                      <button
                        type="button"
                        className="rounded-md text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white"
                        onClick={toggleMobileMenu}
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    </div>

                    {/* User Info */}
                    {isAuthenticated && user && (
                      <div className="px-4 py-4 border-b border-secondary-200">
                        <div className="flex items-center space-x-3">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.username}
                              className="h-12 w-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 bg-primary-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-medium">
                                {user.username?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-secondary-900">
                              {user.username}
                            </p>
                            <p className="text-xs text-secondary-500">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Navigation */}
                    <div className="flex-1 px-4 py-6">
                      <nav className="space-y-1">
                        {/* Main Navigation */}
                        <div className="space-y-1">
                          {navigationItems.map((item) => (
                            <Link
                              key={item.name}
                              to={item.href}
                              onClick={handleLinkClick}
                              className="group flex items-center px-3 py-3 text-sm font-medium text-secondary-700 rounded-lg hover:bg-secondary-100 hover:text-secondary-900 transition-colors"
                            >
                              <item.icon className="mr-3 h-5 w-5 text-secondary-400 group-hover:text-secondary-500" />
                              {item.name}
                            </Link>
                          ))}
                        </div>

                        {/* User Items */}
                        {isAuthenticated && userItems.length > 0 && (
                          <>
                            <div className="pt-6">
                              <h3 className="px-3 text-xs font-semibold text-secondary-500 uppercase tracking-wider">
                                Account
                              </h3>
                              <div className="mt-2 space-y-1">
                                {userItems.map((item) => (
                                  <Link
                                    key={item.name}
                                    to={item.href}
                                    onClick={handleLinkClick}
                                    className="group flex items-center px-3 py-3 text-sm font-medium text-secondary-700 rounded-lg hover:bg-secondary-100 hover:text-secondary-900 transition-colors"
                                  >
                                    <item.icon className="mr-3 h-5 w-5 text-secondary-400 group-hover:text-secondary-500" />
                                    {item.name}
                                  </Link>
                                ))}
                              </div>
                            </div>

                            {/* Developer Dashboard */}
                            {user?.role === 'DEVELOPER' && (
                              <div className="pt-6">
                                <h3 className="px-3 text-xs font-semibold text-secondary-500 uppercase tracking-wider">
                                  Developer
                                </h3>
                                <div className="mt-2 space-y-1">
                                  <Link
                                    to="/developer"
                                    onClick={handleLinkClick}
                                    className="group flex items-center px-3 py-3 text-sm font-medium text-secondary-700 rounded-lg hover:bg-secondary-100 hover:text-secondary-900 transition-colors"
                                  >
                                    <Cog6ToothIcon className="mr-3 h-5 w-5 text-secondary-400 group-hover:text-secondary-500" />
                                    Dashboard
                                  </Link>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </nav>
                    </div>

                    {/* Bottom Actions */}
                    <div className="border-t border-secondary-200 px-4 py-4">
                      {isAuthenticated ? (
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Sign Out
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <Link
                            to="/login"
                            onClick={handleLinkClick}
                            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                          >
                            Sign In
                          </Link>
                          <Link
                            to="/register"
                            onClick={handleLinkClick}
                            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                          >
                            Sign Up
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default MobileMenu