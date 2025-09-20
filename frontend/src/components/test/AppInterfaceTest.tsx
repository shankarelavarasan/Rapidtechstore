import React from 'react'
import { App } from '../../types'

// Test component to verify App interface is working
const AppInterfaceTest: React.FC = () => {
  // Test creating an App object to verify the interface
  const testApp: App = {
    id: 'test-1',
    name: 'Test App',
    description: 'A test application',
    price: 9.99,
    category: 'productivity',
    developer: {
      userId: 'dev-1',
      companyName: 'Test Company',
      verified: true
    },
    rating: 4.5,
    downloads: 1000,
    version: '1.0.0',
    size: '50MB',
    requirements: {
      os: 'Windows 10+',
      ram: '4GB',
      storage: '100MB'
    },
    screenshots: [],
    tags: ['productivity', 'test'],
    platforms: ['desktop'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  return (
    <div className="p-4 border rounded">
      <h3 className="font-semibold mb-2">App Interface Test</h3>
      <p>App Name: {testApp.name}</p>
      <p>Category: {testApp.category}</p>
      <p>Developer: {testApp.developer.companyName}</p>
      <p>Price: ${testApp.price}</p>
      <p className="text-green-600">✅ App interface is working correctly!</p>
    </div>
  )
}

export default AppInterfaceTest