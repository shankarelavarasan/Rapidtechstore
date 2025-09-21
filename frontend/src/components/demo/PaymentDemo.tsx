import React, { useState } from 'react';
import { 
  CreditCardIcon, 
  CheckCircleIcon, 
  InformationCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';

interface TestCard {
  number: string;
  brand: string;
  scenario: string;
  description: string;
  icon: string;
  color: string;
}

const testCards: TestCard[] = [
  {
    number: '4242 4242 4242 4242',
    brand: 'Visa',
    scenario: 'Success',
    description: 'Payment succeeds immediately',
    icon: '✅',
    color: 'green'
  },
  {
    number: '4000 0000 0000 0002',
    brand: 'Visa',
    scenario: 'Declined',
    description: 'Card is declined',
    icon: '❌',
    color: 'red'
  },
  {
    number: '4000 0000 0000 9995',
    brand: 'Visa',
    scenario: 'Insufficient Funds',
    description: 'Card has insufficient funds',
    icon: '💳',
    color: 'orange'
  },
  {
    number: '4000 0000 0000 0069',
    brand: 'Visa',
    scenario: 'Expired Card',
    description: 'Card has expired',
    icon: '⏰',
    color: 'yellow'
  },
  {
    number: '4000 0000 0000 0127',
    brand: 'Visa',
    scenario: 'Incorrect CVC',
    description: 'CVC check fails',
    icon: '🔒',
    color: 'purple'
  },
  {
    number: '4000 0000 0000 0119',
    brand: 'Visa',
    scenario: 'Processing Error',
    description: 'Generic processing error',
    icon: '⚠️',
    color: 'gray'
  }
];

interface PaymentDemoProps {
  isOpen: boolean;
  onClose: () => void;
}

const PaymentDemo: React.FC<PaymentDemoProps> = ({ isOpen, onClose }) => {
  const [selectedCard, setSelectedCard] = useState<TestCard | null>(null);

  if (!isOpen) return null;

  const getColorClasses = (color: string) => {
    const colorMap = {
      green: 'bg-green-50 border-green-200 text-green-800',
      red: 'bg-red-50 border-red-200 text-red-800',
      orange: 'bg-orange-50 border-orange-200 text-orange-800',
      yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      purple: 'bg-purple-50 border-purple-200 text-purple-800',
      gray: 'bg-gray-50 border-gray-200 text-gray-800'
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.gray;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Payment Demo Center</h2>
              <p className="text-gray-600 mt-1">Test different payment scenarios for investor demonstrations</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Test Cards Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CreditCardIcon className="h-5 w-5 mr-2" />
                Stripe Test Cards
              </h3>
              
              <div className="space-y-3">
                {testCards.map((card, index) => (
                  <div
                    key={index}
                    className={cn(
                      'p-4 rounded-lg border-2 cursor-pointer transition-all duration-200',
                      selectedCard === card 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                    onClick={() => setSelectedCard(card)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{card.icon}</span>
                        <div>
                          <div className="font-mono text-sm font-medium text-gray-900">
                            {card.number}
                          </div>
                          <div className="text-xs text-gray-500">{card.brand}</div>
                        </div>
                      </div>
                      <div className={cn('px-2 py-1 rounded-full text-xs font-medium border', getColorClasses(card.color))}>
                        {card.scenario}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{card.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Demo Instructions */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <InformationCircleIcon className="h-5 w-5 mr-2" />
                Demo Instructions
              </h3>

              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">For Investor Presentations:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Use the success card (4242...) to show smooth transactions</li>
                    <li>• Demonstrate error handling with declined cards</li>
                    <li>• Show real-time payment processing feedback</li>
                    <li>• Highlight security features and encryption</li>
                  </ul>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">Test Card Details:</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• <strong>Expiry:</strong> Any future date (e.g., 12/25)</li>
                    <li>• <strong>CVC:</strong> Any 3-digit number (e.g., 123)</li>
                    <li>• <strong>ZIP:</strong> Any valid postal code</li>
                    <li>• <strong>Name:</strong> Any name</li>
                  </ul>
                </div>

                {selectedCard && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Selected Card Details:</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Number:</strong> {selectedCard.number}</div>
                      <div><strong>Scenario:</strong> {selectedCard.scenario}</div>
                      <div><strong>Expected Result:</strong> {selectedCard.description}</div>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(selectedCard.number.replace(/\s/g, ''))}
                      className="mt-3 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    >
                      Copy Card Number
                    </button>
                  </div>
                )}

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 mb-2">Additional Payment Methods:</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• <strong>Razorpay:</strong> Available for Indian market demo</li>
                    <li>• <strong>PayPal:</strong> Integration ready for global markets</li>
                    <li>• <strong>Apple Pay:</strong> Mobile payment demonstration</li>
                    <li>• <strong>Google Pay:</strong> Android payment flows</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center text-sm text-gray-600">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                  Stripe Test Mode Active
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <ClockIcon className="h-4 w-4 text-blue-500 mr-1" />
                  Real-time Processing
                </div>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close Demo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentDemo;