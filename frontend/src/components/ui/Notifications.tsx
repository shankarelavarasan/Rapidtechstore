import React from 'react'
import { Transition } from '@headlessui/react'
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  XCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { useNotificationStore } from '../../store'
import { cn } from '../../lib/utils'

const Notifications: React.FC = () => {
  const { notifications, removeNotification } = useNotificationStore()

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="h-6 w-6 text-green-400" />
      case 'error':
        return <XCircleIcon className="h-6 w-6 text-red-400" />
      case 'warning':
        return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" />
      case 'info':
      default:
        return <InformationCircleIcon className="h-6 w-6 text-blue-400" />
    }
  }

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  const getTextColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-800'
      case 'error':
        return 'text-red-800'
      case 'warning':
        return 'text-yellow-800'
      case 'info':
      default:
        return 'text-blue-800'
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-4 max-w-sm w-full">
      {notifications.map((notification) => (
        <Transition
          key={notification.id}
          show={true}
          enter="transform ease-out duration-300 transition"
          enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
          enterTo="translate-y-0 opacity-100 sm:translate-x-0"
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className={cn(
              'max-w-sm w-full shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden border',
              getBackgroundColor(notification.type)
            )}
          >
            <div className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {getIcon(notification.type)}
                </div>
                <div className="ml-3 w-0 flex-1 pt-0.5">
                  <p className={cn('text-sm font-medium', getTextColor(notification.type))}>
                    {notification.title}
                  </p>
                  {notification.message && (
                    <p className={cn('mt-1 text-sm', getTextColor(notification.type), 'opacity-75')}>
                      {notification.message}
                    </p>
                  )}
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                  <button
                    className={cn(
                      'rounded-md inline-flex focus:outline-none focus:ring-2 focus:ring-offset-2',
                      getTextColor(notification.type),
                      'hover:opacity-75'
                    )}
                    onClick={() => removeNotification(notification.id)}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      ))}
    </div>
  )
}

export default Notifications