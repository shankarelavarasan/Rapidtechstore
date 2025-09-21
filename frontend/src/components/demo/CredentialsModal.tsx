import React, { useState } from 'react';
import { 
  XMarkIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  EyeIcon,
  EyeSlashIcon,
  InformationCircleIcon,
  KeyIcon,
  UserIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';

interface CredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Credential {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  credentials: {
    label: string;
    value: string;
    type?: 'text' | 'password';
    copyable?: boolean;
  }[];
  category: 'auth' | 'payment' | 'api';
}

const demoCredentials: Credential[] = [
  {
    id: 'demo-user',
    title: 'Demo User Account',
    description: 'Pre-configured user account for testing all platform features',
    icon: UserIcon,
    category: 'auth',
    credentials: [
      { label: 'Email', value: 'demo@rapidtech.store', copyable: true },
      { label: 'Password', value: 'DemoUser2024!', type: 'password', copyable: true },
      { label: 'Role', value: 'Standard User' }
    ]
  },
  {
    id: 'admin-user',
    title: 'Admin Demo Account',
    description: 'Administrator account with full platform access',
    icon: KeyIcon,
    category: 'auth',
    credentials: [
      { label: 'Email', value: 'admin@rapidtech.store', copyable: true },
      { label: 'Password', value: 'AdminDemo2024!', type: 'password', copyable: true },
      { label: 'Role', value: 'Administrator' }
    ]
  },
  {
    id: 'developer-user',
    title: 'Developer Account',
    description: 'Developer account with app publishing capabilities',
    icon: UserIcon,
    category: 'auth',
    credentials: [
      { label: 'Email', value: 'developer@rapidtech.store', copyable: true },
      { label: 'Password', value: 'DevDemo2024!', type: 'password', copyable: true },
      { label: 'Role', value: 'Developer' }
    ]
  },
  {
    id: 'stripe-test',
    title: 'Stripe Test Cards',
    description: 'Test credit cards for payment flow demonstration',
    icon: CreditCardIcon,
    category: 'payment',
    credentials: [
      { label: 'Success Card', value: '4242 4242 4242 4242', copyable: true },
      { label: 'Declined Card', value: '4000 0000 0000 0002', copyable: true },
      { label: 'Insufficient Funds', value: '4000 0000 0000 9995', copyable: true },
      { label: 'Expiry Date', value: '12/25' },
      { label: 'CVC', value: '123' }
    ]
  }
];

const CredentialsModal: React.FC<CredentialsModalProps> = ({ isOpen, onClose }) => {
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<'auth' | 'payment' | 'api'>('auth');

  const handleCopy = async (value: string, id: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedItems(prev => new Set([...prev, id]));
      setTimeout(() => {
        setCopiedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const categories = [
    { id: 'auth' as const, label: 'User Accounts', count: demoCredentials.filter(c => c.category === 'auth').length },
    { id: 'payment' as const, label: 'Payment Testing', count: demoCredentials.filter(c => c.category === 'payment').length },
    { id: 'api' as const, label: 'API Keys', count: demoCredentials.filter(c => c.category === 'api').length }
  ];

  const filteredCredentials = demoCredentials.filter(cred => cred.category === activeCategory);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-primary-600 to-accent-600">
          <div className="flex items-center justify-between">
            <div className="text-white">
              <h2 className="text-2xl font-bold">Demo Credentials</h2>
              <p className="text-primary-100 mt-1">Quick access to all demo accounts and test data</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold p-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
            <div className="space-y-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center justify-between',
                    activeCategory === category.id
                      ? 'bg-primary-100 text-primary-700 border border-primary-200'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  <span className="font-medium">{category.label}</span>
                  <span className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    activeCategory === category.id
                      ? 'bg-primary-200 text-primary-700'
                      : 'bg-gray-200 text-gray-600'
                  )}>
                    {category.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Demo Environment</p>
                  <p>All credentials are for demonstration purposes only. No real transactions will be processed.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
              {filteredCredentials.map((credential) => {
                const Icon = credential.icon;
                return (
                  <div key={credential.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-primary-100 rounded-lg">
                        <Icon className="h-6 w-6 text-primary-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{credential.title}</h3>
                        <p className="text-gray-600 mb-4">{credential.description}</p>
                        
                        <div className="space-y-3">
                          {credential.credentials.map((cred, index) => {
                            const credId = `${credential.id}-${index}`;
                            const isPassword = cred.type === 'password';
                            const isVisible = visiblePasswords.has(credId);
                            const isCopied = copiedItems.has(credId);
                            
                            return (
                              <div key={index} className="flex items-center space-x-3">
                                <div className="w-32 text-sm font-medium text-gray-700">
                                  {cred.label}:
                                </div>
                                <div className="flex-1 flex items-center space-x-2">
                                  <code className={cn(
                                    'px-3 py-2 bg-gray-100 rounded font-mono text-sm flex-1',
                                    isPassword && !isVisible ? 'text-gray-400' : 'text-gray-900'
                                  )}>
                                    {isPassword && !isVisible ? '••••••••••••' : cred.value}
                                  </code>
                                  
                                  {isPassword && (
                                    <button
                                      onClick={() => togglePasswordVisibility(credId)}
                                      className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                                      title={isVisible ? 'Hide password' : 'Show password'}
                                    >
                                      {isVisible ? (
                                        <EyeSlashIcon className="h-4 w-4" />
                                      ) : (
                                        <EyeIcon className="h-4 w-4" />
                                      )}
                                    </button>
                                  )}
                                  
                                  {cred.copyable && (
                                    <button
                                      onClick={() => handleCopy(cred.value, credId)}
                                      className={cn(
                                        'p-2 rounded-lg transition-colors',
                                        isCopied
                                          ? 'text-green-600 bg-green-100'
                                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                      )}
                                      title={isCopied ? 'Copied!' : 'Copy to clipboard'}
                                    >
                                      {isCopied ? (
                                        <CheckIcon className="h-4 w-4" />
                                      ) : (
                                        <ClipboardDocumentIcon className="h-4 w-4" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              💡 <strong>Tip:</strong> Use these credentials to explore all platform features during your demo
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CredentialsModal;