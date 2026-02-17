"use client"

import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { useChat } from '@/app/contexts/ChatContext';

export const ChatButton: React.FC = () => {
  const { openChat } = useChat();

  return (
    <Button
      onClick={openChat}
      className="fixed bottom-10 right-5 rounded-full p-4 bg-green-500 hover:bg-green-600" 
      aria-label="Open Chat"
    >
      <MessageCircle className="h-6 w-6" />
    </Button>
  );
};