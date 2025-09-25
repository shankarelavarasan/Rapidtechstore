import React, { createContext, useContext, useState, useCallback } from 'react';
import { ChatBot } from './ChatBot';

interface ChatBotContextType {
  isOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
}

const ChatBotContext = createContext<ChatBotContextType | undefined>(undefined);

export const useChatBot = () => {
  const context = useContext(ChatBotContext);
  if (context === undefined) {
    throw new Error('useChatBot must be used within a ChatBotProvider');
  }
  return context;
};

interface ChatBotProviderProps {
  children: React.ReactNode;
  position?: 'bottom-right' | 'bottom-left';
  theme?: 'light' | 'dark';
  autoOpen?: boolean;
  autoOpenDelay?: number;
}

export const ChatBotProvider: React.FC<ChatBotProviderProps> = ({
  children,
  position = 'bottom-right',
  theme = 'light',
  autoOpen = false,
  autoOpenDelay = 5000
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const openChat = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Auto-open functionality
  React.useEffect(() => {
    if (autoOpen && !isOpen) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, autoOpenDelay);

      return () => clearTimeout(timer);
    }
  }, [autoOpen, autoOpenDelay, isOpen]);

  const contextValue: ChatBotContextType = {
    isOpen,
    openChat,
    closeChat,
    toggleChat
  };

  return (
    <ChatBotContext.Provider value={contextValue}>
      {children}
      <ChatBot
        isOpen={isOpen}
        onToggle={toggleChat}
        position={position}
        theme={theme}
      />
    </ChatBotContext.Provider>
  );
};