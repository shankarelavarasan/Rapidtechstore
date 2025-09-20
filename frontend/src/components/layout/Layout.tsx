import React from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import MobileMenu from './MobileMenu'
import Cart from '../cart/Cart'
import Notifications from '../ui/Notifications'
import { useUIStore, useNotificationStore } from '../../store'

const Layout: React.FC = () => {
  const { isMobileMenuOpen, isCartOpen } = useUIStore()

  return (
    <div className="min-h-screen bg-secondary-50 flex flex-col">
      {/* Header */}
      <Header />
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && <MobileMenu />}
      
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