"use client"

import React, { createContext, useState, useContext, ReactNode } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatContextType {
  isChatOpen: boolean;
  messages: Message[];
  openChat: () => void;
  closeChat: () => void;
  addMessage: (message: Message) => void;
  clearChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  

  const openChat = async () => {
    setIsChatOpen(true);

    if (messages.length === 0) {
      const welcomeMessage: Message = {
        role: "assistant",
        content: `Hello, how can I help you?`,
      };
      setMessages([welcomeMessage]);
    }
  };
  const closeChat = () => setIsChatOpen(false);
  const addMessage = (message: Message) => setMessages((prev) => [...prev, message]);
  const clearChat = () => setMessages([]);

  return (
    <ChatContext.Provider value={{ isChatOpen, messages, openChat, closeChat, addMessage, clearChat }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};