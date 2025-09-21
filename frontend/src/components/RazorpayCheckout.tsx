import React, { useState } from 'react';
import { 
  CreditCardIcon, 
  BanknotesIcon, 
  DevicePhoneMobileIcon,
  BuildingLibraryIcon 
} from '@heroicons/react/24/outline';
import LoadingSpinner from './ui/LoadingSpinner';

interface RazorpayCheckoutProps {
  appId: string;
  appName: string;
  amount: number;
  currency?: string;
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const RazorpayCheckout: React.FC<RazorpayCheckoutProps> = ({
  appId,
  appName,
  amount,
  currency = 'INR',
  onSuccess,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('card');

  const paymentMethods = [
    {
      id: 'card',
      name: 'Credit/Debit Card',
      icon: CreditCardIcon,
      description: 'Visa, Mastercard, RuPay'
    },
    {
      id: 'netbanking',
      name: 'Net Banking',
      icon: BuildingLibraryIcon,
      description: 'All major banks supported'
    },
    {
      id: 'upi',
      name: 'UPI',
      icon: DevicePhoneMobileIcon,
      description: 'PhonePe, Google Pay, Paytm'
    },
    {
      id: 'wallet',
      name: 'Wallets',
      icon: BanknotesIcon,
      description: 'Paytm, Mobikwik, Freecharge'
    }
  ];

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setIsLoading(true);

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        onError('Failed to load Razorpay SDK');
        return;
      }

      // Demo configuration - in production, this would come from backend
      const options = {
        key: 'rzp_test_demo_key', // Demo key
        amount: Math.round(amount * 100), // Amount in paise
        currency: currency,
        name: 'Rapid Tech Store',
        description: `Purchase of ${appName}`,
        image: '/logo.png',
        order_id: `order_demo_${Date.now()}`, // Demo order ID
        prefill: {
          name: 'Demo User',
          email: 'demo@rapidtech.store',
          contact: '+919999999999'
        },
        notes: {
          app_id: appId,
          app_name: appName
        },
        theme: {
          color: '#3B82F6'
        },
        method: {
          card: selectedMethod === 'card',
          netbanking: selectedMethod === 'netbanking',
          upi: selectedMethod === 'upi',
          wallet: selectedMethod === 'wallet'
        },
        handler: function (response: any) {
          // Demo success response
          console.log('Razorpay Payment Success:', response);
          onSuccess(response.razorpay_payment_id || `demo_payment_${Date.now()}`);
        },
        modal: {
          ondismiss: function() {
            setIsLoading(false);
          }
        }
      };

      // For demo purposes, simulate different scenarios
      if (amount < 10) {
        // Simulate payment failure for very low amounts
        setTimeout(() => {
          onError('Payment failed: Minimum amount not met');
          setIsLoading(false);
        }, 2000);
        return;
      }

      // Create Razorpay instance and open checkout
      const razorpay = new window.Razorpay(options);
      
      razorpay.on('payment.failed', function (response: any) {
        onError(response.error.description || 'Payment failed');
        setIsLoading(false);
      });

      razorpay.open();
      setIsLoading(false);

    } catch (error) {
      onError('Payment initialization failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Razorpay Payment (India)
        </h3>
        
        {/* Payment Method Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Payment Method
          </label>
          <div className="grid grid-cols-2 gap-3">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedMethod === method.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedMethod(method.id)}
              >
                <div className="flex items-center space-x-2">
                  <method.icon className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {method.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {method.description}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-gray-50 p-4 rounded-md mb-6">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">App:</span>
            <span className="font-medium">{appName}</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-gray-600">Amount:</span>
            <span className="font-medium">
              ₹{amount.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-gray-600">Payment Method:</span>
            <span className="font-medium capitalize">
              {paymentMethods.find(m => m.id === selectedMethod)?.name}
            </span>
          </div>
        </div>

        {/* Demo Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-6">
          <div className="text-sm text-yellow-800">
            <strong>Demo Mode:</strong> This is a demonstration of Razorpay integration. 
            No actual payment will be processed.
          </div>
        </div>

        {/* Payment Button */}
        <button
          onClick={handlePayment}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" />
              <span className="ml-2">Processing...</span>
            </>
          ) : (
            `Pay ₹${amount.toFixed(2)} with Razorpay`
          )}
        </button>

        {/* Supported Methods */}
        <div className="mt-4 text-center">
          <div className="text-xs text-gray-500">
            Supports 100+ payment methods including UPI, Cards, Net Banking, and Wallets
          </div>
        </div>
      </div>
    </div>
  );
};

export default RazorpayCheckout;