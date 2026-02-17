"use client"

import React, { useState} from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { X, Trash2 } from 'lucide-react';
import { useChat } from '@/app/contexts/ChatContext';
import { LoadingDots } from './LoadingDots';

export const ChatInterface: React.FC = () => {
  const { isChatOpen, closeChat, messages, addMessage, clearChat } = useChat();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isChatOpen) return null;

  return (
    <Card className="fixed bottom-20 right-4 w-1/3 h-3/5 flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>HR_Assistant</CardTitle>
        <div className="flex">
          <Button variant="ghost" size="icon" onClick={clearChat} title="Clear Chat">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={closeChat} title="Close Chat">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-auto text-sm dark:text-black">
        {messages.map((message, index) => (
          <div key={index} className={`mb-2 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
            <span className={`inline-block p-2 rounded ${message.role === 'user' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
              {message.content}
            </span>
          </div>
        ))}
        {isLoading && (
          <div className="text-left mb-2">
            <span className="inline-block p-2 rounded bg-gray-200">
              <LoadingDots />
            </span>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col">
        <form className="flex w-full">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask questions"
            className="flex-grow mr-2"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            Send
          </Button>
        </form>        
        <div
          className="mt-2 w-full text-sm text-orange-400 rounded-md"
        >
          {/* This is an AI-generated message - please verify for accuracy. */}
        </div>
      </CardFooter>
    </Card>
  );
};