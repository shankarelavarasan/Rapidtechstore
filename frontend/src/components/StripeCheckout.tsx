import React, { useState, useEffect } from 'react';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import stripePromise from '../lib/stripe';
import { PaymentService } from '../services/paymentService';
import LoadingSpinner from './ui/LoadingSpinner';

interface CheckoutFormProps {
  appId: string;
  appName: string;
  amount: number;
  currency: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({
  appId,
  appName,
  amount,
  currency,
  onSuccess,
  onError,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');

  useEffect(() => {
    // Create payment using the orchestrator when component mounts
    const createPayment = async () => {
      try {
        // Get user ID from localStorage or auth context
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
          onError('Authentication required');
          return;
        }

        // Decode user ID from token (simplified - in production use proper JWT decoding)
        const userId = 'user-1'; // This should come from auth context

        const response = await PaymentService.createPayment({
          userId,
          amount: Math.round(amount * 100), // Convert to cents
          currency,
          paymentMethod: 'stripe',
          description: `Purchase of ${appName}`,
          metadata: {
            appId,
            appName,
          },
        });

        if (response.success && response.clientSecret) {
          setClientSecret(response.clientSecret);
          setPaymentIntentId(response.transactionId);
        } else {
          onError(response.error || 'Failed to initialize payment');
        }
      } catch (error) {
        onError('Failed to initialize payment');
      }
    };

    createPayment();
  }, [appId, amount, currency, appName, onError]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setIsLoading(true);

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      onError('Card element not found');
      setIsLoading(false);
      return;
    }

    try {
      // Confirm the payment with Stripe
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        onError(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Check payment status with our backend
        try {
          const statusResponse = await PaymentService.getPaymentStatus(paymentIntentId);

          if (statusResponse.success && statusResponse.status === 'completed') {
            onSuccess(paymentIntentId);
          } else {
            // Payment succeeded on Stripe but not confirmed in our system yet
            // This could be due to webhook delay, so we'll consider it successful
            onSuccess(paymentIntentId);
          }
        } catch (statusError) {
          // Even if status check fails, if Stripe says it succeeded, we'll consider it successful
          onSuccess(paymentIntentId);
        }
      }
    } catch (error) {
      onError('Payment processing failed');
    } finally {
      setIsLoading(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Payment Details
        </h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Information
          </label>
          <div className="p-3 border border-gray-300 rounded-md">
            <CardElement options={cardElementOptions} />
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-md mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">App:</span>
            <span className="font-medium">{appName}</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-gray-600">Amount:</span>
            <span className="font-medium">
              {currency.toUpperCase()} {amount.toFixed(2)}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={!stripe || isLoading || !clientSecret}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" />
              <span className="ml-2">Processing...</span>
            </>
          ) : (
            `Pay ${currency.toUpperCase()} ${amount.toFixed(2)}`
          )}
        </button>
      </div>
    </form>
  );
};

interface StripeCheckoutProps {
  appId: string;
  appName: string;
  amount: number;
  currency?: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}

const StripeCheckout: React.FC<StripeCheckoutProps> = ({
  appId,
  appName,
  amount,
  currency = 'usd',
  onSuccess,
  onError,
}) => {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm
        appId={appId}
        appName={appName}
        amount={amount}
        currency={currency}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
};

export default StripeCheckout;