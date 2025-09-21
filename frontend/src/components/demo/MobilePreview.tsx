import React, { useState } from 'react'
import { 
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  DeviceTabletIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/outline'
import { cn } from '../../lib/utils'

interface MobilePreviewProps {
  className?: string
}

const MobilePreview: React.FC<MobilePreviewProps> = ({ className }) => {
  const [activeDevice, setActiveDevice] = useState<'mobile' | 'tablet' | 'desktop'>('mobile')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentScreen, setCurrentScreen] = useState(0)

  const devices = [
    { id: 'mobile', name: 'Mobile', icon: DevicePhoneMobileIcon, width: 'w-80', height: 'h-[600px]' },
    { id: 'tablet', name: 'Tablet', icon: DeviceTabletIcon, width: 'w-96', height: 'h-[500px]' },
    { id: 'desktop', name: 'Desktop', icon: ComputerDesktopIcon, width: 'w-[600px]', height: 'h-[400px]' }
  ]

  const screens = [
    {
      title: 'App Discovery',
      description: 'Browse through curated categories',
      image: '/api/placeholder/400/600',
      features: ['AI-powered search', 'Smart recommendations', 'Category filtering']
    },
    {
      title: 'App Details',
      description: 'Rich app information and reviews',
      image: '/api/placeholder/400/600',
      features: ['Detailed descriptions', 'User reviews', 'Screenshots gallery']
    },
    {
      title: 'Seamless Checkout',
      description: 'One-click purchase experience',
      image: '/api/placeholder/400/600',
      features: ['Multiple payment options', 'Secure transactions', 'Instant downloads']
    },
    {
      title: 'Developer Dashboard',
      description: 'Comprehensive analytics and insights',
      image: '/api/placeholder/400/600',
      features: ['Real-time analytics', 'Revenue tracking', 'User engagement metrics']
    }
  ]

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
    if (!isPlaying) {
      // Auto-advance screens every 3 seconds
      const interval = setInterval(() => {
        setCurrentScreen((prev) => (prev + 1) % screens.length)
      }, 3000)
      
      setTimeout(() => {
        clearInterval(interval)
        setIsPlaying(false)
      }, screens.length * 3000)
    }
  }

  const currentDeviceConfig = devices.find(d => d.id === activeDevice)!

  return (
    <div className={cn('bg-white rounded-xl p-8 shadow-lg border border-secondary-200', className)}>
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-secondary-900 mb-4">
          Interactive Mobile Experience
        </h3>
        <p className="text-secondary-600 max-w-2xl mx-auto">
          Experience our platform across all devices. See how users discover, purchase, and manage apps seamlessly.
        </p>
      </div>

      {/* Device Selector */}
      <div className="flex justify-center mb-8">
        <div className="flex bg-secondary-100 rounded-lg p-1">
          {devices.map((device) => {
            const Icon = device.icon
            return (
              <button
                key={device.id}
                onClick={() => setActiveDevice(device.id as any)}
                className={cn(
                  'flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  activeDevice === device.id
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-secondary-600 hover:text-secondary-900'
                )}
              >
                <Icon className="h-4 w-4 mr-2" />
                {device.name}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
        {/* Device Frame */}
        <div className="relative">
          <div className={cn(
            'relative bg-secondary-900 rounded-3xl p-4 shadow-2xl',
            currentDeviceConfig.width,
            currentDeviceConfig.height
          )}>
            {/* Screen */}
            <div className="w-full h-full bg-white rounded-2xl overflow-hidden relative">
              {/* Mock App Interface */}
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="bg-primary-600 text-white p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                      <span className="text-primary-600 font-bold text-sm">RT</span>
                    </div>
                    <span className="font-semibold">Rapid Tech Store</span>
                  </div>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-4 bg-secondary-50">
                  <div className="text-center mb-4">
                    <h4 className="font-bold text-secondary-900 mb-2">
                      {screens[currentScreen].title}
                    </h4>
                    <p className="text-sm text-secondary-600">
                      {screens[currentScreen].description}
                    </p>
                  </div>

                  {/* Mock Content */}
                  <div className="space-y-3">
                    {screens[currentScreen].features.map((feature, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 flex items-center">
                        <div className="w-3 h-3 bg-primary-600 rounded-full mr-3"></div>
                        <span className="text-sm text-secondary-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Mock App Cards */}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="bg-white rounded-lg p-2">
                        <div className="w-full h-12 bg-secondary-200 rounded mb-2"></div>
                        <div className="h-2 bg-secondary-200 rounded mb-1"></div>
                        <div className="h-2 bg-secondary-200 rounded w-3/4"></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Navigation */}
                <div className="bg-white border-t border-secondary-200 p-4">
                  <div className="flex justify-around">
                    {['Home', 'Apps', 'Cart', 'Profile'].map((tab, index) => (
                      <div key={tab} className="text-center">
                        <div className={cn(
                          'w-6 h-6 rounded-full mx-auto mb-1',
                          index === currentScreen ? 'bg-primary-600' : 'bg-secondary-300'
                        )}></div>
                        <span className="text-xs text-secondary-600">{tab}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Play/Pause Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-300 group">
                <button
                  onClick={handlePlayPause}
                  className="opacity-0 group-hover:opacity-100 bg-white bg-opacity-90 rounded-full p-3 transition-opacity duration-300"
                >
                  {isPlaying ? (
                    <PauseIcon className="h-6 w-6 text-primary-600" />
                  ) : (
                    <PlayIcon className="h-6 w-6 text-primary-600" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Device Indicators */}
          <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {screens.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentScreen(index)}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  index === currentScreen ? 'bg-primary-600' : 'bg-secondary-300'
                )}
              />
            ))}
          </div>
        </div>

        {/* Features List */}
        <div className="lg:w-80">
          <h4 className="text-xl font-bold text-secondary-900 mb-6">
            Cross-Platform Excellence
          </h4>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                <span className="text-green-600 text-sm">✓</span>
              </div>
              <div>
                <h5 className="font-semibold text-secondary-900">Responsive Design</h5>
                <p className="text-sm text-secondary-600">Optimized for all screen sizes and devices</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                <span className="text-green-600 text-sm">✓</span>
              </div>
              <div>
                <h5 className="font-semibold text-secondary-900">Native Performance</h5>
                <p className="text-sm text-secondary-600">Fast loading and smooth interactions</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                <span className="text-green-600 text-sm">✓</span>
              </div>
              <div>
                <h5 className="font-semibold text-secondary-900">Offline Capabilities</h5>
                <p className="text-sm text-secondary-600">Browse and manage apps even offline</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                <span className="text-green-600 text-sm">✓</span>
              </div>
              <div>
                <h5 className="font-semibold text-secondary-900">Progressive Web App</h5>
                <p className="text-sm text-secondary-600">Install directly from browser</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-8">
            <button
              onClick={handlePlayPause}
              className="w-full btn-primary btn-glow py-3 flex items-center justify-center"
            >
              {isPlaying ? (
                <>
                  <PauseIcon className="h-5 w-5 mr-2" />
                  Pause Demo
                </>
              ) : (
                <>
                  <PlayIcon className="h-5 w-5 mr-2" />
                  Start Interactive Demo
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MobilePreview