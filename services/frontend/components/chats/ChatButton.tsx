"use client";

import { useChat } from "@/app/contexts/ChatContext";
import { Sparkles, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export const ChatButton = () => {
  const { toggleChat, isOpen } = useChat();

  return (
    <button
      onClick={toggleChat}
      className={cn(
        "fixed bottom-8 right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-full transition-all duration-500 shadow-2xl group overflow-hidden",
        isOpen 
          ? "bg-destructive text-destructive-foreground rotate-90 scale-0" 
          : "bg-primary text-primary-foreground hover:scale-110 hover:shadow-primary/40"
      )}
    >
      {/* Background Pulse Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary via-blue-400 to-primary animate-gradient-x opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative flex items-center gap-3">
        <div className="relative">
          <Sparkles className="w-6 h-6 animate-pulse" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border-2 border-primary animate-ping" />
        </div>
        <span className="font-bold uppercase tracking-wider text-xs">AI Assist</span>
      </div>
      
      {/* Decorative inner glow */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
    </button>
  );
};
