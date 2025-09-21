import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import MobileMenu from './MobileMenu'
import Cart from '../cart/Cart'
import Notifications from '../ui/Notifications'
import Breadcrumb from '../ui/Breadcrumb'
import InvestorNavigation from '../demo/InvestorNavigation'
import { useUIStore, useCartStore } from '../../store'

const Layout: React.FC = () => {
  const { mobileMenuOpen } = useUIStore()
  const { isOpen: isCartOpen } = useCartStore()
  const location = useLocation()
  
  // Show investor navigation on key demo pages
  const showInvestorNav = [
    '/',
    '/apps',
    '/categories',
    '/developer-dashboard',
    '/ai-search'
  ].includes(location.pathname)
  
  // Show breadcrumbs on non-home pages
  const showBreadcrumbs = location.pathname !== '/' && !showInvestorNav

  return (
    <div className="min-h-screen bg-secondary-50 flex flex-col">
      {/* Header */}
      <Header />
      
      {/* Investor Navigation for Demo */}
      {showInvestorNav && <InvestorNavigation />}
      
      {/* Breadcrumb Navigation */}
      {showBreadcrumbs && (
        <div className="bg-white border-b border-secondary-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <Breadcrumb />
          </div>
        </div>
      )}
      
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && <MobileMenu />}
      
      {/* Cart Sidebar */}
      {isCartOpen && <Cart />}
      
      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>
      
      {/* Footer */}
      <Footer />
      
      {/* Global Notifications */}
      <Notifications />
    </div>
  )
}

export default Layout