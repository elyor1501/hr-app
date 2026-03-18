"use client"

import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, Sparkles } from 'lucide-react';
import { useChat } from '@/app/contexts/ChatContext';

export const ChatButton: React.FC = () => {
  const { openChat } = useChat();

  return (
    <Button
      onClick={openChat}
      className="fixed bottom-6 right-6 px-4 py-2 rounded-xl shadow-lg 
                 bg-gradient-to-r from-blue-600 to-indigo-600 
                 hover:from-blue-700 hover:to-indigo-700 
                 text-white font-medium flex items-center gap-2"
    >
      <Sparkles className="h-4 w-4" />
      AI Assist
    </Button>
  );
};