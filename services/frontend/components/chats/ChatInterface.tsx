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
    <div className="fixed bottom-8 right-8 z-[60] w-[450px] h-[650px] flex flex-col glass rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden border-border/40 animate-in slide-in-from-bottom-8 fade-in duration-500">
      {/* Header */}
      <div className="h-24 bg-primary text-primary-foreground px-8 flex items-center justify-between relative overflow-hidden shrink-0">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/20" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
             <Brain className="w-7 h-7 animate-pulse text-white" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold text-primary-foreground tracking-tight">AI Assistant</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)] animate-ping" />
              <span className="text-[10px] font-bold tracking-widest opacity-80">SYSTEM ONLINE</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 relative z-10">
           <button 
            onClick={clearHistory}
            className="p-2 hover:bg-white/10 rounded-full transition-colors opacity-50 hover:opacity-100"
            title="Clear History"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button 
            onClick={toggleChat}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all hover:rotate-90"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Background Glow */}
        <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-card/30 backdrop-blur-md">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 px-10">
            <div className="w-16 h-16 bg-primary/5 rounded-3xl flex items-center justify-center border border-primary/10 mb-4">
              <Sparkles className="w-8 h-8 text-primary/40" />
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
              "flex flex-col max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300",
              msg.role === "user" ? "ml-auto items-end" : "items-start"
            )}
          >
            <div className={cn(
               "flex items-center gap-2 mb-2 px-1",
               msg.role === "user" ? "flex-row-reverse" : "flex-row"
            )}>
               <div className="w-6 h-6 rounded-lg bg-secondary flex items-center justify-center text-[10px] font-black border border-border">
                  {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
               </div>
               <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {msg.role === "user" ? "CONSULTANT" : "AI ENGINE"}
               </span>
            </div>
            <div
              className={cn(
                "p-4 rounded-3xl text-sm font-medium leading-relaxed shadow-sm transition-all",
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
          <div className="flex items-start max-w-[85%] animate-in fade-in duration-300">
             <div className="w-6 h-6 rounded-lg bg-secondary flex items-center justify-center mr-2 border border-border">
                <Bot className="w-3.5 h-3.5" />
             </div>
             <div className="bg-background border border-border/50 p-4 rounded-3xl rounded-tl-none shadow-sm">
                <LoadingDots />
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 bg-card/80 backdrop-blur-md border-t border-border/40 shrink-0">
        <form onSubmit={handleSubmit} className="relative flex items-center gap-3 group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="TYPE YOUR REQUEST..."
            className="flex-1 bg-background border-border/50 rounded-2xl px-6 py-4 text-xs tracking-widest  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pr-16"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-2 bottom-2 aspect-square bg-primary text-primary-foreground rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale shadow-lg shadow-primary/20"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
