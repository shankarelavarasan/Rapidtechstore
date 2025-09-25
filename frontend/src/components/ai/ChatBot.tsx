import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, X, Bot, User, Minimize2, Maximize2, ThumbsUp, ThumbsDown, Star, MessageSquare, RefreshCw, History } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  feedback?: {
    rating?: number;
    helpful?: boolean;
    comment?: string;
  };
  category?: string;
  needsHuman?: boolean;
}

interface ChatBotProps {
  isOpen?: boolean;
  onToggle?: () => void;
  position?: 'bottom-right' | 'bottom-left';
  theme?: 'light' | 'dark';
}

export const ChatBot: React.FC<ChatBotProps> = ({
  isOpen = false,
  onToggle,
  position = 'bottom-right',
  theme = 'light'
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hi! I\'m RapidBot, your AI assistant for Rapid Tech Store. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [showFeedback, setShowFeedback] = useState<string | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  // Load chat history when component mounts
  useEffect(() => {
    if (isOpen) {
      loadChatHistory();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3020/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId,
          context: {
            currentPage: window.location.pathname,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: ChatMessage = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: data.data.response,
          timestamp: new Date(data.data.timestamp),
          category: data.data.category?.category,
          needsHuman: data.data.category?.needsHuman
        };
        setMessages(prev => [...prev, assistantMessage]);

        // Load recommendations if available
        if (data.data.category?.category === 'product' || userMessage.content.toLowerCase().includes('recommend')) {
          loadRecommendations(userMessage.content);
        }
      } else {
        throw new Error(data.message || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'I apologize, but I\'m having trouble connecting right now. Please try again or contact our support team.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const loadRecommendations = async (query: string) => {
    try {
      const response = await fetch('http://localhost:3020/api/ai/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          context: {
            currentPage: window.location.pathname,
            sessionId
          }
        })
      });

      const data = await response.json();
      if (data.success && data.data.recommendations) {
        setRecommendations(data.data.recommendations);
        setShowRecommendations(true);
      }
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    }
  };

  const submitFeedback = async (messageId: string, helpful: boolean, rating?: number, comment?: string) => {
    try {
      const response = await fetch('http://localhost:3020/api/ai/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          messageId,
          helpful,
          rating,
          comment,
          timestamp: new Date().toISOString()
        })
      });

      const data = await response.json();
      if (data.success) {
        // Update message with feedback
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, feedback: { helpful, rating, comment } }
            : msg
        ));
        setShowFeedback(null);
        setFeedbackComment('');
        setFeedbackRating(0);
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const loadChatHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`http://localhost:3020/api/ai/chat/history/${sessionId}`);
      const data = await response.json();
      
      if (data.success && data.data.messages) {
        const historyMessages = data.data.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          category: msg.category,
          needsHuman: msg.needsHuman
        }));
        setMessages(historyMessages);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const clearChatSession = async () => {
    try {
      await fetch(`http://localhost:3020/api/ai/chat/session/${sessionId}`, {
        method: 'DELETE'
      });
      
      setMessages([{
        id: '1',
        role: 'assistant',
        content: 'Hi! I\'m RapidBot, your AI assistant for Rapid Tech Store. How can I help you today?',
        timestamp: new Date()
      }]);
      setRecommendations([]);
      setShowRecommendations(false);
    } catch (error) {
      console.error('Failed to clear chat session:', error);
    }
  };

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  const themeClasses = {
    light: 'bg-white border-gray-200 text-gray-900',
    dark: 'bg-gray-800 border-gray-600 text-white'
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className={`fixed ${positionClasses[position]} z-50 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110`}
        aria-label="Open chat support"
      >
        <MessageCircle size={24} />
      </button>
    );
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50 w-96 h-[500px] ${themeClasses[theme]} border rounded-lg shadow-xl flex flex-col transition-all duration-300`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <Bot size={16} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">RapidBot</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">AI Support Assistant</p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowRecommendations(!showRecommendations)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            aria-label="Toggle recommendations"
            title="Product Recommendations"
          >
            <Star size={14} className={showRecommendations ? "text-yellow-500" : ""} />
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            aria-label="Toggle chat history"
            title="Chat History"
          >
            <History size={14} className={showHistory ? "text-blue-500" : ""} />
          </button>
          <button
            onClick={clearChatSession}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            aria-label="Clear chat"
            title="Clear Chat"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            aria-label={isMinimized ? "Maximize chat" : "Minimize chat"}
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button
            onClick={onToggle}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            aria-label="Close chat"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-2 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                  }`}>
                    {message.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                  </div>
                  <div className="flex flex-col space-y-2">
                    <div className={`p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs opacity-70">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {message.category && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            message.category === 'technical' ? 'bg-blue-100 text-blue-800' :
                            message.category === 'billing' ? 'bg-green-100 text-green-800' :
                            message.category === 'product' ? 'bg-purple-100 text-purple-800' :
                            message.category === 'account' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {message.category}
                          </span>
                        )}
                      </div>
                      {message.needsHuman && (
                        <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900 rounded text-xs text-yellow-800 dark:text-yellow-200">
                          This query may require human assistance. Would you like to contact our support team?
                        </div>
                      )}
                    </div>
                    
                    {/* Feedback buttons for assistant messages */}
                    {message.role === 'assistant' && message.id !== '1' && (
                      <div className="flex items-center space-x-2 ml-2">
                        {!message.feedback ? (
                          <>
                            <button
                              onClick={() => submitFeedback(message.id, true)}
                              className="p-1 hover:bg-green-100 dark:hover:bg-green-900 rounded transition-colors"
                              title="Helpful"
                            >
                              <ThumbsUp size={12} className="text-gray-500 hover:text-green-600" />
                            </button>
                            <button
                              onClick={() => submitFeedback(message.id, false)}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                              title="Not helpful"
                            >
                              <ThumbsDown size={12} className="text-gray-500 hover:text-red-600" />
                            </button>
                            <button
                              onClick={() => setShowFeedback(message.id)}
                              className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900 rounded transition-colors"
                              title="Detailed feedback"
                            >
                              <MessageSquare size={12} className="text-gray-500 hover:text-blue-600" />
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            {message.feedback.helpful ? (
                              <ThumbsUp size={12} className="text-green-600" />
                            ) : (
                              <ThumbsDown size={12} className="text-red-600" />
                            )}
                            <span>Feedback submitted</span>
                            {message.feedback.rating && (
                              <div className="flex items-center ml-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    size={10}
                                    className={star <= (message.feedback?.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-2 max-w-[80%]">
                  <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                    <Bot size={12} className="text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Feedback Modal */}
          {showFeedback && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-sm w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">Provide Feedback</h3>
                
                {/* Rating */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Rate this response:</label>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setFeedbackRating(star)}
                        className="p-1"
                      >
                        <Star
                          size={20}
                          className={star <= feedbackRating ? 'text-yellow-400 fill-current' : 'text-gray-300'}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Additional comments (optional):</label>
                  <textarea
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={3}
                    placeholder="Tell us how we can improve..."
                  />
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      submitFeedback(showFeedback, feedbackRating >= 3, feedbackRating, feedbackComment);
                    }}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Submit
                  </button>
                  <button
                    onClick={() => {
                      setShowFeedback(null);
                      setFeedbackComment('');
                      setFeedbackRating(0);
                    }}
                    className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations Panel */}
          {showRecommendations && recommendations.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-600 p-4 max-h-32 overflow-y-auto">
              <h4 className="text-sm font-semibold mb-2 flex items-center">
                <Star size={14} className="text-yellow-500 mr-1" />
                Recommended for you
              </h4>
              <div className="space-y-2">
                {recommendations.slice(0, 3).map((rec, index) => (
                  <div key={index} className="text-xs p-2 bg-blue-50 dark:bg-blue-900 rounded border-l-2 border-blue-500">
                    <div className="font-medium text-blue-800 dark:text-blue-200">{rec.category || rec.name}</div>
                    <div className="text-blue-600 dark:text-blue-300">{rec.description || rec.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-600">
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about apps, billing, technical support..."
                className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                aria-label="Send message"
              >
                <Send size={16} />
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Powered by AI • Press Enter to send
              </p>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                {showRecommendations && recommendations.length > 0 && (
                  <span className="flex items-center">
                    <Star size={10} className="text-yellow-500 mr-1" />
                    {recommendations.length} recommendations
                  </span>
                )}
                <span>Session: {sessionId.split('_')[1]}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};