import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  CreditCardIcon, 
  LockClosedIcon, 
  ShieldCheckIcon,
  TrashIcon 
} from '@heroicons/react/24/outline'
import { useCartStore, useAuthStore, useNotificationStore } from '../store'
import { formatCurrency, cn } from '../lib/utils'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import StripeCheckout from '../components/StripeCheckout'
import { PaymentService } from '../services/paymentService'

const Checkout: React.FC = () => {
  const navigate = useNavigate()
  const { items, total, removeFromCart, clearCart } = useCartStore()
  const { user } = useAuthStore()
  const { addNotification } = useNotificationStore()

  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('stripe')
  const [useStripe, setUseStripe] = useState(true)
  const [billingInfo, setBillingInfo] = useState({
    email: user?.email || '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US'
  })
  const [cardInfo, setCardInfo] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: ''
  })

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/checkout' } } })
      return
    }

    if (items.length === 0) {
      navigate('/apps')
      return
    }
  }, [user, items, navigate])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    section: 'billing' | 'card'
  ) => {
    const { name, value } = e.target
    
    if (section === 'billing') {
      setBillingInfo(prev => ({ ...prev, [name]: value }))
    } else {
      setCardInfo(prev => ({ ...prev, [name]: value }))
    }
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }

    if (parts.length) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4)
    }
    return v
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value)
    setCardInfo(prev => ({ ...prev, number: formatted }))
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiry(e.target.value)
    setCardInfo(prev => ({ ...prev, expiry: formatted }))
  }

  const validateForm = () => {
    const errors: string[] = []

    // Billing validation
    if (!billingInfo.firstName.trim()) errors.push('First name is required')
    if (!billingInfo.lastName.trim()) errors.push('Last name is required')
    if (!billingInfo.email.trim()) errors.push('Email is required')
    if (!billingInfo.address.trim()) errors.push('Address is required')
    if (!billingInfo.city.trim()) errors.push('City is required')
    if (!billingInfo.zipCode.trim()) errors.push('ZIP code is required')

    // Card validation
    if (paymentMethod === 'card') {
      if (!cardInfo.number.replace(/\s/g, '')) errors.push('Card number is required')
      if (!cardInfo.expiry) errors.push('Expiry date is required')
      if (!cardInfo.cvc) errors.push('CVC is required')
      if (!cardInfo.name.trim()) errors.push('Cardholder name is required')
    }

    if (errors.length > 0) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: errors[0]
      })
      return false
    }

    return true
  }

  const handleStripeSuccess = (paymentIntentId: string) => {
    // Clear cart and show success
    clearCart()
    
    addNotification({
      type: 'success',
      title: 'Payment successful!',
      message: 'Your apps have been purchased successfully.'
    })

    navigate('/profile/purchases')
  }

  const handleStripeError = (error: string) => {
    addNotification({
      type: 'error',
      title: 'Payment failed',
      message: error
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    // For Stripe payments, the StripeCheckout component handles the submission
    if (paymentMethod === 'stripe') {
      return
    }

    setLoading(true)

    try {
      // Get user ID from auth context
      const userId = 'user-1'; // This should come from auth context

      // Create payment using the orchestrator
      const response = await PaymentService.createPayment({
        userId,
        amount: Math.round(finalTotal * 100), // Convert to cents
        currency: 'usd',
        paymentMethod: 'card', // Legacy card processing
        description: items.length === 1 
          ? `Purchase of ${items[0].app.name}` 
          : `Purchase of ${items.length} apps`,
        metadata: {
          items: items.map(item => ({
            appId: item.app.id,
            appName: item.app.name,
            price: item.app.price
          }))
        },
      });

      if (response.success) {
        // Clear cart and show success
        clearCart()
        
        addNotification({
          type: 'success',
          title: 'Order completed!',
          message: 'Your apps have been purchased successfully.'
        })

        navigate('/profile/purchases')
      } else {
        addNotification({
          type: 'error',
          title: 'Payment failed',
          message: response.error || 'Please check your payment information and try again.'
        })
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Payment failed',
        message: 'Please check your payment information and try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  const tax = total * 0.08 // 8% tax
  const finalTotal = total + tax

  if (!user || items.length === 0) {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-secondary-900 mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="order-2 lg:order-1">
            <div className="bg-white rounded-lg border border-secondary-200 p-6">
              <h2 className="text-xl font-semibold text-secondary-900 mb-4">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.app.id} className="flex items-center gap-4">
                    <img
                      src={item.app.screenshots?.[0] || '/placeholder-app.png'}
                      alt={item.app.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-secondary-900">{item.app.name}</h3>
                      <p className="text-sm text-secondary-600">by {item.app.developer.companyName}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-secondary-900">
                        {formatCurrency(item.app.price)}
                      </div>
                      <button
                        onClick={() => removeFromCart(item.app.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-secondary-200 pt-4 space-y-2">
                <div className="flex justify-between text-secondary-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between text-secondary-600">
                  <span>Tax</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold text-secondary-900 border-t border-secondary-200 pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(finalTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="order-1 lg:order-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Billing Information */}
              <div className="bg-white rounded-lg border border-secondary-200 p-6">
                <h2 className="text-xl font-semibold text-secondary-900 mb-4">Billing Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="billing-firstName" className="block text-sm font-medium text-secondary-700 mb-1">
                      First Name
                    </label>
                    <input
                      id="billing-firstName"
                      type="text"
                      name="firstName"
                      value={billingInfo.firstName}
                      onChange={(e) => handleInputChange(e, 'billing')}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="billing-lastName" className="block text-sm font-medium text-secondary-700 mb-1">
                      Last Name
                    </label>
                    <input
                      id="billing-lastName"
                      type="text"
                      name="lastName"
                      value={billingInfo.lastName}
                      onChange={(e) => handleInputChange(e, 'billing')}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label htmlFor="billing-email" className="block text-sm font-medium text-secondary-700 mb-1">
                    Email
                  </label>
                  <input
                    id="billing-email"
                    type="email"
                    name="email"
                    value={billingInfo.email}
                    onChange={(e) => handleInputChange(e, 'billing')}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                <div className="mt-4">
                  <label htmlFor="billing-address" className="block text-sm font-medium text-secondary-700 mb-1">
                    Address
                  </label>
                  <input
                    id="billing-address"
                    type="text"
                    name="address"
                    value={billingInfo.address}
                    onChange={(e) => handleInputChange(e, 'billing')}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label htmlFor="billing-city" className="block text-sm font-medium text-secondary-700 mb-1">
                      City
                    </label>
                    <input
                      id="billing-city"
                      type="text"
                      name="city"
                      value={billingInfo.city}
                      onChange={(e) => handleInputChange(e, 'billing')}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="billing-state" className="block text-sm font-medium text-secondary-700 mb-1">
                      State
                    </label>
                    <input
                      id="billing-state"
                      type="text"
                      name="state"
                      value={billingInfo.state}
                      onChange={(e) => handleInputChange(e, 'billing')}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="billing-zipCode" className="block text-sm font-medium text-secondary-700 mb-1">
                      ZIP Code
                    </label>
                    <input
                      id="billing-zipCode"
                      type="text"
                      name="zipCode"
                      value={billingInfo.zipCode}
                      onChange={(e) => handleInputChange(e, 'billing')}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-lg border border-secondary-200 p-6">
                <h2 className="text-xl font-semibold text-secondary-900 mb-4">Payment Method</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      id="stripe"
                      name="paymentMethod"
                      type="radio"
                      value="stripe"
                      checked={paymentMethod === 'stripe'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300"
                    />
                    <label htmlFor="stripe" className="ml-3 flex items-center">
                      <CreditCardIcon className="h-5 w-5 text-secondary-400 mr-2" />
                      Secure Card Payment (Stripe)
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      id="card"
                      name="paymentMethod"
                      type="radio"
                      value="card"
                      checked={paymentMethod === 'card'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300"
                    />
                    <label htmlFor="card" className="ml-3 flex items-center">
                      <CreditCardIcon className="h-5 w-5 text-secondary-400 mr-2" />
                      Credit/Debit Card (Legacy)
                    </label>
                  </div>

                  {paymentMethod === 'stripe' && (
                    <div className="ml-7 mt-4">
                      <StripeCheckout
                        appId={items[0]?.app.id || ''}
                        appName={items.length === 1 ? items[0].app.name : `${items.length} apps`}
                        amount={finalTotal}
                        currency="usd"
                        onSuccess={handleStripeSuccess}
                        onError={handleStripeError}
                      />
                    </div>
                  )}

                  {paymentMethod === 'card' && (
                    <div className="ml-7 space-y-4 border-l-2 border-secondary-200 pl-4">
                      <div>
                        <label htmlFor="card-number" className="block text-sm font-medium text-secondary-700 mb-1">
                          Card Number
                        </label>
                        <input
                          id="card-number"
                          type="text"
                          value={cardInfo.number}
                          onChange={handleCardNumberChange}
                          placeholder="1234 5678 9012 3456"
                          maxLength={19}
                          className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="card-expiry" className="block text-sm font-medium text-secondary-700 mb-1">
                            Expiry Date
                          </label>
                          <input
                            id="card-expiry"
                            type="text"
                            value={cardInfo.expiry}
                            onChange={handleExpiryChange}
                            placeholder="MM/YY"
                            maxLength={5}
                            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="card-cvc" className="block text-sm font-medium text-secondary-700 mb-1">
                            CVC
                          </label>
                          <input
                            id="card-cvc"
                            type="text"
                            name="cvc"
                            value={cardInfo.cvc}
                            onChange={(e) => handleInputChange(e, 'card')}
                            placeholder="123"
                            maxLength={4}
                            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="card-name" className="block text-sm font-medium text-secondary-700 mb-1">
                          Cardholder Name
                        </label>
                        <input
                          id="card-name"
                          type="text"
                          name="name"
                          value={cardInfo.name}
                          onChange={(e) => handleInputChange(e, 'card')}
                          className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Security Notice */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <ShieldCheckIcon className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-sm text-green-700">
                    Your payment information is encrypted and secure
                  </span>
                </div>
              </div>

              {/* Submit Button - Only show for non-Stripe payments */}
              {paymentMethod !== 'stripe' && (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <LockClosedIcon className="h-5 w-5" />
                      Complete Purchase - {formatCurrency(finalTotal)}
                    </>
                  )}
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Checkout