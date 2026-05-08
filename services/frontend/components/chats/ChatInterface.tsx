"use client";

import { useChat } from "@/app/contexts/ChatContext";
import { X, Send, Sparkles, Brain, Bot, User, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { LoadingDots } from "./LoadingDots";

export const ChatInterface = () => {
  const { isOpen, toggleChat, messages, sendMessage, isLoading, clearHistory } = useChat();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 sm:bottom-6 md:bottom-8 right-4 sm:right-6 md:right-8 z-[60] w-[calc(100%-2rem)] sm:w-[400px] md:w-[450px] h-[calc(100%-2rem)] sm:h-[600px] md:h-[650px] flex flex-col glass rounded-2xl sm:rounded-[2rem] md:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden border-border/40 animate-in slide-in-from-bottom-8 fade-in duration-500">
      {/* Header */}
      <div className="h-20 sm:h-24 bg-primary text-primary-foreground px-4 sm:px-6 md:px-8 flex items-center justify-between relative overflow-hidden shrink-0">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/20" />
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 relative z-10">
          <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 bg-white/10 rounded-xl sm:rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
             <Brain className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 animate-pulse text-white" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-base sm:text-lg font-semibold text-primary-foreground tracking-tight">AI Assistant</h3>
            <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)] animate-ping" />
              <span className="text-[8px] sm:text-[10px] font-bold tracking-widest opacity-80">SYSTEM ONLINE</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 relative z-10">
           <button 
            onClick={clearHistory}
            className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors opacity-50 hover:opacity-100"
            title="Clear History"
          >
            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button 
            onClick={toggleChat}
            className="p-1.5 sm:p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all hover:rotate-90"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
        
        {/* Background Glow */}
        <div className="absolute -right-10 -bottom-10 w-24 h-24 sm:w-32 sm:h-32 bg-white/5 rounded-full blur-2xl" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-5 md:space-y-6 custom-scrollbar bg-card/30 backdrop-blur-md">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 sm:space-y-4 px-4 sm:px-6 md:px-10">
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-primary/5 rounded-2xl sm:rounded-3xl flex items-center justify-center border border-primary/10 mb-2 sm:mb-4">
              <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-primary/40" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">How can I assist you?</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Try asking about candidate rankings, job requirements, or resume summaries.
            </p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={cn(
              "flex flex-col max-w-[90%] sm:max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300",
              msg.role === "user" ? "ml-auto items-end" : "items-start"
            )}
          >
            <div className={cn(
               "flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 px-1",
               msg.role === "user" ? "flex-row-reverse" : "flex-row"
            )}>
               <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-secondary flex items-center justify-center text-[10px] font-black border border-border">
                  {msg.role === "user" ? <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Bot className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
               </div>
               <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {msg.role === "user" ? "CONSULTANT" : "AI ENGINE"}
               </span>
            </div>
            <div
              className={cn(
                "p-3 sm:p-4 rounded-2xl sm:rounded-3xl text-xs sm:text-sm font-medium leading-relaxed shadow-sm transition-all",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-none shadow-primary/10"
                  : "bg-background border border-border/50 text-foreground rounded-tl-none shadow-black/5"
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start max-w-[90%] sm:max-w-[85%] animate-in fade-in duration-300">
             <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-secondary flex items-center justify-center mr-1.5 sm:mr-2 border border-border">
                <Bot className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
             </div>
             <div className="bg-background border border-border/50 p-3 sm:p-4 rounded-2xl sm:rounded-3xl rounded-tl-none shadow-sm">
                <LoadingDots />
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 sm:p-5 md:p-6 bg-card/80 backdrop-blur-md border-t border-border/40 shrink-0">
        <form onSubmit={handleSubmit} className="relative flex items-center gap-2 sm:gap-3 group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="TYPE YOUR REQUEST..."
            className="flex-1 bg-background border-border/50 rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pr-12 sm:pr-16"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-1.5 sm:right-2 top-1.5 sm:top-2 bottom-1.5 sm:bottom-2 aspect-square bg-primary text-primary-foreground rounded-lg sm:rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale shadow-lg shadow-primary/20"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};