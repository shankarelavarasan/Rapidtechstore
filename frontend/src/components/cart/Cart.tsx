import React from 'react'
import { Link } from 'react-router-dom'
import { Dialog, Transition } from '@headlessui/react'
import { 
  XMarkIcon,
  ShoppingCartIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { useCartStore, useUIStore } from '../../store'
import { formatCurrency } from '../../lib/utils'

const Cart: React.FC = () => {
  const { isCartOpen, toggleCart } = useUIStore()
  const { items, updateQuantity, removeItem, clearCart, getTotal } = useCartStore()

  const handleQuantityChange = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(id)
    } else {
      updateQuantity(id, newQuantity)
    }
  }

  const total = getTotal()
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <Transition show={isCartOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={toggleCart}>
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
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={React.Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-6 bg-white border-b border-secondary-200">
                      <div className="flex items-center space-x-2">
                        <ShoppingCartIcon className="h-6 w-6 text-secondary-600" />
                        <h2 className="text-lg font-medium text-secondary-900">
                          Shopping Cart ({itemCount})
                        </h2>
                      </div>
                      <button
                        type="button"
                        className="rounded-md text-secondary-400 hover:text-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        onClick={toggleCart}
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 px-4 py-6">
                      {items.length === 0 ? (
                        <div className="text-center py-12">
                          <ShoppingCartIcon className="mx-auto h-12 w-12 text-secondary-400" />
                          <h3 className="mt-4 text-sm font-medium text-secondary-900">
                            Your cart is empty
                          </h3>
                          <p className="mt-1 text-sm text-secondary-500">
                            Start adding some apps to your cart!
                          </p>
                          <div className="mt-6">
                            <Link
                              to="/apps"
                              onClick={toggleCart}
                              className="btn-primary"
                            >
                              Browse Apps
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Clear Cart Button */}
                          {items.length > 0 && (
                            <div className="flex justify-end">
                              <button
                                onClick={clearCart}
                                className="text-sm text-red-600 hover:text-red-700 font-medium"
                              >
                                Clear Cart
                              </button>
                            </div>
                          )}

                          {/* Cart Items List */}
                          <div className="space-y-4">
                            {items.map((item) => (
                              <div key={item.app.id} className="flex items-center space-x-4 p-4 bg-secondary-50 rounded-lg">
                                {/* App Icon */}
                                <div className="flex-shrink-0">
                                  {item.app.icon ? (
                                    <img
                                      src={item.app.icon}
                                      alt={item.app.name}
                                      className="h-12 w-12 rounded-lg object-cover"
                                    />
                                  ) : (
                                    <div className="h-12 w-12 bg-primary-500 rounded-lg flex items-center justify-center">
                                      <span className="text-white font-medium text-sm">
                                        {item.app.name.charAt(0)}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* App Info */}
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium text-secondary-900 truncate">
                                    {item.app.name}
                                  </h4>
                                  <p className="text-sm text-secondary-500">
                                    {formatCurrency(item.app.price)}
                                  </p>
                                  
                                  {/* Quantity Controls */}
                                  <div className="flex items-center space-x-2 mt-2">
                                    <button
                                      onClick={() => handleQuantityChange(item.app.id, item.quantity - 1)}
                                      className="p-1 rounded-md text-secondary-400 hover:text-secondary-600 hover:bg-secondary-200"
                                    >
                                      <MinusIcon className="h-4 w-4" />
                                    </button>
                                    <span className="text-sm font-medium text-secondary-900 min-w-[2rem] text-center">
                                      {item.quantity}
                                    </span>
                                    <button
                                      onClick={() => handleQuantityChange(item.app.id, item.quantity + 1)}
                                      className="p-1 rounded-md text-secondary-400 hover:text-secondary-600 hover:bg-secondary-200"
                                    >
                                      <PlusIcon className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>

                                {/* Remove Button */}
                                <div className="flex flex-col items-end space-y-2">
                                  <button
                                    onClick={() => removeItem(item.app.id)}
                                    className="p-1 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                  <p className="text-sm font-medium text-secondary-900">
                                    {formatCurrency(item.app.price * item.quantity)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    {items.length > 0 && (
                      <div className="border-t border-secondary-200 px-4 py-6 bg-secondary-50">
                        {/* Total */}
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-base font-medium text-secondary-900">
                            Total
                          </span>
                          <span className="text-lg font-bold text-secondary-900">
                            {formatCurrency(total)}
                          </span>
                        </div>

                        {/* Checkout Button */}
                        <Link
                          to="/checkout"
                          onClick={toggleCart}
                          className="w-full btn-primary text-center block"
                        >
                          Proceed to Checkout
                        </Link>

                        {/* Continue Shopping */}
                        <button
                          onClick={toggleCart}
                          className="w-full mt-3 btn-ghost text-center"
                        >
                          Continue Shopping
                        </button>
                      </div>
                    )}
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

export default Cart