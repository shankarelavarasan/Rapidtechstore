import React from 'react'
import { App } from '../../types'

// Test component to verify App interface is working
const AppInterfaceTest: React.FC = () => {
  // Test creating an App object to verify the interface
  const testApp: App = {
    id: 'test-1',
    name: 'Test App',
    description: 'A test application',
    shortDescription: 'A test app for interface verification',
    icon: '/icons/test-app.svg',
    screenshots: ['/screenshots/test-1.jpg'],
    category: {
      id: 'productivity',
      name: 'Productivity',
      slug: 'productivity',
      description: 'Productivity tools',
      icon: '/icons/productivity.svg',
      appCount: 100
    },
    subcategory: 'Utilities',
    version: '1.0.0',
    size: 52428800, // 50MB in bytes
    price: 9.99,
    currency: 'USD',
    isPaid: true,
    isPublished: true,
    downloadCount: 1000,
    rating: 4.5,
    reviewCount: 50,
    developer: {
      id: 'dev-1',
      name: 'Test Company',
      email: 'test@company.com',
      verificationStatus: 'VERIFIED',
      totalApps: 5,
      totalDownloads: 10000,
      averageRating: 4.5,
      createdAt: new Date().toISOString()
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['productivity', 'test'],
    features: ['Easy to use', 'Fast performance'],
    requirements: {
      os: ['Windows 10+'],
      minRam: '4GB',
      minStorage: '100MB',
      processor: 'Intel i3 or equivalent'
    }
  }

  return (
    <div className="p-4 border rounded">
      <h3 className="font-semibold mb-2">App Interface Test</h3>
      <p>App Name: {testApp.name}</p>
      <p>Category: {testApp.category.name}</p>
      <p>Developer: {testApp.developer.name}</p>
      <p>Price: ${testApp.price}</p>
      <p className="text-green-600">✅ App interface is working correctly!</p>
    </div>
  )
}

export default AppInterfaceTest