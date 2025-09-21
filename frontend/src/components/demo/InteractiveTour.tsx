import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  PlayIcon,
  PauseIcon,
  ArrowRightIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector for the element to highlight
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: {
    type: 'click' | 'hover' | 'scroll';
    element: string;
    description: string;
  };
}

interface InteractiveTourProps {
  isVisible: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Rapid Tech Store',
    description: 'This interactive tour will showcase our comprehensive digital marketplace platform. Let\'s explore the key features that make us the future of tech commerce.',
    target: '[data-tour="header-logo"]',
    position: 'bottom'
  },
  {
    id: 'ai-search',
    title: 'AI-Powered Search',
    description: 'Our intelligent search uses OpenAI to understand natural language queries. Try searching for "productivity tools for developers" to see AI recommendations.',
    target: '[data-tour="search-bar"]',
    position: 'bottom',
    action: {
      type: 'click',
      element: '[data-tour="search-bar"] input',
      description: 'Click to try AI search'
    }
  },
  {
    id: 'categories',
    title: 'Comprehensive Categories',
    description: 'Browse through our extensive categories: SaaS tools, AI/AGI solutions, IDE plugins, mobile apps, and more. Each category is carefully curated.',
    target: '[data-tour="categories"]',
    position: 'top'
  },
  {
    id: 'featured-apps',
    title: 'Featured Applications',
    description: 'Discover trending and featured applications. Each app includes detailed descriptions, reviews, and instant deployment options.',
    target: '[data-tour="featured"]',
    position: 'top'
  },
  {
    id: 'app-details',
    title: 'Detailed App Information',
    description: 'Click on any app to see comprehensive details, user reviews, pricing, and technical specifications. Our platform provides transparency.',
    target: '.app-card:first-child',
    position: 'right',
    action: {
      type: 'click',
      element: '.app-card:first-child',
      description: 'Click to view app details'
    }
  },
  {
    id: 'shopping-cart',
    title: 'Shopping Cart & Checkout',
    description: 'Add items to your cart and experience our streamlined checkout process with multiple payment options.',
    target: '[data-tour="cart"]',
    position: 'bottom'
  },
  {
    id: 'user-dashboard',
    title: 'User Dashboard & Analytics',
    description: 'Access your personalized dashboard with purchase history, recommendations, and usage analytics. Perfect for both individual and enterprise users.',
    target: '[data-tour="user-menu"]',
    position: 'bottom'
  },
  {
    id: 'complete',
    title: 'Tour Complete!',
    description: 'You\'ve explored the key features of Rapid Tech Store. We\'re building the future of digital commerce with AI-powered discovery, seamless payments, and comprehensive analytics.',
    target: '[data-tour="header-logo"]',
    position: 'bottom'
  }
];

const InteractiveTour: React.FC<InteractiveTourProps> = ({ isVisible, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [highlightedElement, setHighlightedElement] = useState<Element | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  const currentTourStep = tourSteps[currentStep];

  useEffect(() => {
    if (!isVisible) return;

    // Highlight the target element
    const targetElement = document.querySelector(currentTourStep.target);
    if (targetElement) {
      setHighlightedElement(targetElement);
      
      // Calculate tooltip position
      const rect = targetElement.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      let top = rect.top + scrollTop;
      let left = rect.left + scrollLeft;
      
      switch (currentTourStep.position) {
        case 'bottom':
          top += rect.height + 10;
          left += rect.width / 2;
          break;
        case 'top':
          top -= 10;
          left += rect.width / 2;
          break;
        case 'right':
          top += rect.height / 2;
          left += rect.width + 10;
          break;
        case 'left':
          top += rect.height / 2;
          left -= 10;
          break;
      }
      
      setTooltipPosition({ top, left });
      
      // Scroll element into view
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center'
      });
    }
  }, [currentStep, isVisible, currentTourStep]);

  useEffect(() => {
    if (!isVisible) return;

    // Add highlight styles
    if (highlightedElement) {
      highlightedElement.classList.add('tour-highlight');
    }

    return () => {
      // Cleanup highlight styles
      if (highlightedElement) {
        highlightedElement.classList.remove('tour-highlight');
      }
    };
  }, [highlightedElement, isVisible]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying && isVisible) {
      interval = setInterval(() => {
        if (currentStep < tourSteps.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          setIsPlaying(false);
          handleComplete();
        }
      }, 4000); // 4 seconds per step
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentStep, isVisible]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsPlaying(false);
    if (onComplete) {
      onComplete();
    }
    onClose();
  };

  const handleActionClick = () => {
    if (currentTourStep.action) {
      const actionElement = document.querySelector(currentTourStep.action.element);
      if (actionElement) {
        if (currentTourStep.action.type === 'click') {
          (actionElement as HTMLElement).click();
        }
      }
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />
      
      {/* Tour Tooltip */}
      <div
        className="fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-200 max-w-sm w-full"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          transform: currentTourStep.position === 'top' || currentTourStep.position === 'bottom' 
            ? 'translateX(-50%)' 
            : currentTourStep.position === 'left' 
            ? 'translateX(-100%)' 
            : 'translateX(0)'
        }}
      >
        {/* Arrow */}
        <div 
          className={`absolute w-3 h-3 bg-white border transform rotate-45 ${
            currentTourStep.position === 'bottom' ? '-top-1.5 left-1/2 -translate-x-1/2 border-b-0 border-r-0' :
            currentTourStep.position === 'top' ? '-bottom-1.5 left-1/2 -translate-x-1/2 border-t-0 border-l-0' :
            currentTourStep.position === 'right' ? '-left-1.5 top-1/2 -translate-y-1/2 border-r-0 border-b-0' :
            '-right-1.5 top-1/2 -translate-y-1/2 border-l-0 border-t-0'
          }`}
        />
        
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-blue-600">
                  {currentStep + 1}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {currentTourStep.title}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <p className="text-gray-600 mb-4 leading-relaxed">
            {currentTourStep.description}
          </p>

          {/* Action Button */}
          {currentTourStep.action && (
            <button
              onClick={handleActionClick}
              className="w-full mb-4 bg-blue-50 border border-blue-200 text-blue-700 py-2 px-4 rounded-md hover:bg-blue-100 transition-colors flex items-center justify-center space-x-2"
            >
              <ArrowRightIcon className="h-4 w-4" />
              <span>{currentTourStep.action.description}</span>
            </button>
          )}

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{currentStep + 1} of {tourSteps.length}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 text-blue-600 hover:text-blue-700"
              >
                {isPlaying ? (
                  <PauseIcon className="h-5 w-5" />
                ) : (
                  <PlayIcon className="h-5 w-5" />
                )}
              </button>
              
              <button
                onClick={handleNext}
                disabled={currentStep === tourSteps.length - 1}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center space-x-2">
              {currentStep === tourSteps.length - 1 ? (
                <button
                  onClick={handleComplete}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>Complete</span>
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tour Styles - Applied via className */}
      <style>{`
        .tour-highlight {
          position: relative;
          z-index: 45;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.2);
          border-radius: 8px;
          transition: all 0.3s ease;
        }
      `}</style>
    </>
  );
};

export default InteractiveTour;