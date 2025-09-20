import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  MagnifyingGlassIcon, 
  ShoppingCartIcon, 
  UserIcon, 
  Bars3Icon,
  BellIcon,
  HeartIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import { Menu, Transition } from '@headlessui/react'
import { useAuthStore, useCartStore, useUIStore } from '../../store'
import { cn } from '../../lib/utils'

const Header: React.FC = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuthStore()
  const { items, toggleCart } = useCartStore()
  const { toggleMobileMenu } = useUIStore()
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const cartItemCount = items.reduce((total, item) => total + item.quantity, 0)

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-secondary-200 shadow-sm backdrop-blur-sm bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo and Mobile Menu */}
          <div className="flex items-center">
            <button
              onClick={toggleMobileMenu}
              className="md:hidden p-2 rounded-md text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            
            <Link to="/" className="flex items-center space-x-2 ml-2 md:ml-0">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">RT</span>
              </div>
              <span className="hidden sm:block text-xl font-bold text-secondary-900">
                Rapid Tech Store
              </span>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-lg mx-4">
            <form onSubmit={handleSearch} className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-secondary-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search apps, games, and more..."
                className="block w-full pl-10 pr-4 py-2.5 border border-secondary-300 rounded-lg leading-5 bg-white placeholder-secondary-500 focus:outline-none focus:placeholder-secondary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 shadow-sm hover:shadow-md"
              />
              <button
                type="submit"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary-400 hover:text-primary-500 transition-colors"
              >
                <span className="sr-only">Search</span>
              </button>
            </form>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Cart */}
            <button
              onClick={toggleCart}
              className="relative p-2 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 rounded-lg transition-colors"
            >
              <ShoppingCartIcon className="h-6 w-6" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* User Menu */}
            {isAuthenticated ? (
              <Menu as="div" className="relative">
                <Menu.Button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-secondary-100 transition-colors">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 bg-primary-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user?.username?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="hidden md:block text-sm font-medium text-secondary-900">
                    {user?.username}
                  </span>
                </Menu.Button>

                <Transition
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right bg-white border border-secondary-200 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            to="/profile"
                            className={cn(
                              'flex items-center px-4 py-2 text-sm',
                              active ? 'bg-secondary-100 text-secondary-900' : 'text-secondary-700'
                            )}
                          >
                            <UserIcon className="h-4 w-4 mr-3" />
                            Profile
                          </Link>
                        )}
                      </Menu.Item>
                      
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            to="/favorites"
                            className={cn(
                              'flex items-center px-4 py-2 text-sm',
                              active ? 'bg-secondary-100 text-secondary-900' : 'text-secondary-700'
                            )}
                          >
                            <HeartIcon className="h-4 w-4 mr-3" />
                            Favorites
                          </Link>
                        )}
                      </Menu.Item>

                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            to="/purchases"
                            className={cn(
                              'flex items-center px-4 py-2 text-sm',
                              active ? 'bg-secondary-100 text-secondary-900' : 'text-secondary-700'
                            )}
                          >
                            <ShoppingCartIcon className="h-4 w-4 mr-3" />
                            My Purchases
                          </Link>
                        )}
                      </Menu.Item>

                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            to="/notifications"
                            className={cn(
                              'flex items-center px-4 py-2 text-sm',
                              active ? 'bg-secondary-100 text-secondary-900' : 'text-secondary-700'
                            )}
                          >
                            <BellIcon className="h-4 w-4 mr-3" />
                            Notifications
                          </Link>
                        )}
                      </Menu.Item>

                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            to="/settings"
                            className={cn(
                              'flex items-center px-4 py-2 text-sm',
                              active ? 'bg-secondary-100 text-secondary-900' : 'text-secondary-700'
                            )}
                          >
                            <Cog6ToothIcon className="h-4 w-4 mr-3" />
                            Settings
                          </Link>
                        )}
                      </Menu.Item>

                      {user?.role === 'DEVELOPER' && (
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to="/developer"
                              className={cn(
                                'flex items-center px-4 py-2 text-sm',
                                active ? 'bg-secondary-100 text-secondary-900' : 'text-secondary-700'
                              )}
                            >
                              <Cog6ToothIcon className="h-4 w-4 mr-3" />
                              Developer Dashboard
                            </Link>
                          )}
                        </Menu.Item>
                      )}

                      <hr className="my-1 border-secondary-200" />
                      
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={handleLogout}
                            className={cn(
                              'flex items-center w-full px-4 py-2 text-sm text-left',
                              active ? 'bg-secondary-100 text-secondary-900' : 'text-secondary-700'
                            )}
                          >
                            <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                            Sign Out
                          </button>
                        )}
                      </Menu.Item>
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="btn-ghost px-4 py-2 text-sm font-medium"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="btn-primary px-4 py-2 text-sm font-medium"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header