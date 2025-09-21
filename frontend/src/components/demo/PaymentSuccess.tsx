import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { formatCurrency } from '../../lib/utils';

interface PaymentSuccessProps {
  isVisible: boolean;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentId: string;
  onClose: () => void;
}

const PaymentSuccess: React.FC<PaymentSuccessProps> = ({
  isVisible,
  amount,
  currency,
  paymentMethod,
  paymentId,
  onClose
}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    if (isVisible) {
      setAnimationStep(0);
      setShowConfetti(false);
      
      // Animation sequence
      const timer1 = setTimeout(() => setAnimationStep(1), 100);
      const timer2 = setTimeout(() => setAnimationStep(2), 600);
      const timer3 = setTimeout(() => setShowConfetti(true), 1000);
      const timer4 = setTimeout(() => onClose(), 4000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
      };
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center relative overflow-hidden">
        {/* Confetti Animation */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`
                }}
              >
                <SparklesIcon className="h-4 w-4 text-yellow-400" />
              </div>
            ))}
          </div>
        )}

        {/* Success Icon */}
        <div className={`mx-auto mb-6 transition-all duration-500 ${
          animationStep >= 1 ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
        }`}>
          <div className="relative">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircleIcon className="h-12 w-12 text-green-600" />
            </div>
            {animationStep >= 2 && (
              <div className="absolute inset-0 w-20 h-20 bg-green-200 rounded-full animate-ping opacity-75 mx-auto"></div>
            )}
          </div>
        </div>

        {/* Success Message */}
        <div className={`transition-all duration-500 delay-300 ${
          animationStep >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h2>
          <p className="text-gray-600 mb-6">
            Your purchase has been completed successfully
          </p>

          {/* Payment Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Amount:</span>
              <span className="font-semibold">
                {formatCurrency(amount, currency)}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Payment Method:</span>
              <span className="font-semibold capitalize">{paymentMethod}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Transaction ID:</span>
              <span className="font-mono text-xs bg-gray-200 px-2 py-1 rounded">
                {paymentId}
              </span>
            </div>
          </div>

          {/* Demo Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
            <p className="text-xs text-blue-800">
              <strong>Demo Mode:</strong> This is a simulated transaction for demonstration purposes.
            </p>
          </div>

          {/* Action Button */}
          <button
            onClick={onClose}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;