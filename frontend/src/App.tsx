/**
 * RAPID TECH STORE - FRONTEND APPLICATION
 * 
 * Copyright (c) 2024 RAPID TECH - SHANKAR ELAVARASAN <shankarelavarasan90@gmail.com>
 * ALL RIGHTS RESERVED - PROPRIETARY SOFTWARE
 * 
 * This file is part of the Rapid Tech Store platform.
 * Unauthorized copying, modification, distribution, or use is strictly prohibited.
 * 
 * For licensing inquiries: shankarelavarasan90@gmail.com
 */

import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import Apps from './pages/Apps'
import AppDetail from './pages/AppDetail'
import Categories from './pages/Categories'

import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Profile from './pages/Profile'
import Checkout from './pages/Checkout'
import DeveloperDashboard from './pages/DeveloperDashboard'
import NotFound from './pages/NotFound'
import ProtectedRoute from './components/auth/ProtectedRoute'
import { useAuthStore } from './store'

function App() {
  const { validateToken } = useAuthStore()

  useEffect(() => {
    // Validate token on app startup
    validateToken()
  }, [validateToken])

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="apps" element={<Apps />} />
          <Route path="apps/:id" element={<AppDetail />} />
          <Route path="categories" element={<Categories />} />
          <Route path="categories/:category" element={<Apps />} />

          <Route path="login" element={
            <ProtectedRoute requireAuth={false}>
              <Login />
            </ProtectedRoute>
          } />
          <Route path="register" element={
            <ProtectedRoute requireAuth={false}>
              <Register />
            </ProtectedRoute>
          } />
          <Route path="profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="checkout" element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          } />
          <Route path="developer/*" element={
            <ProtectedRoute>
              <DeveloperDashboard />
            </ProtectedRoute>
          } />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
