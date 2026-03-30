"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { X, Trash2, Briefcase, Scale, Palette, Globe } from 'lucide-react';
import { useChat } from '@/app/contexts/ChatContext';
import { LoadingDots } from './LoadingDots';
import { getGeminiResponse, getExpertResponse } from '@/lib/gemini';

export const ChatInterface: React.FC = () => {
  const { isChatOpen, closeChat, messages, addMessage, clearChat } = useChat();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<'en' | 'de'>('en');
  const [hoveredSearcher, setHoveredSearcher] = useState<string | null>(null);

  const predefinedSearchers = [
    { 
      name: 'HR', 
      type: 'HR' as const,
      icon: Briefcase,
      color: 'bg-blue-100 hover:bg-blue-200 text-blue-700',
      descriptionEn: 'HR Expert - Recruitment, Employee Relations, Benefits',
      descriptionDe: 'HR-Experte - Rekrutierung, Mitarbeiterbeziehungen, Sozialleistungen',
      tooltipPrompts: {
        en: [
          "How to conduct effective interviews?",
          "What are the best employee retention strategies?",
          "How to handle workplace conflicts?",
          "What are the latest HR compliance regulations?"
        ],
        de: [
          "Wie führe ich effektive Vorstellungsgespräche durch?",
          "Was sind die besten Mitarbeiterbindungsstrategien?",
          "Wie gehe ich mit Konflikten am Arbeitsplatz um?",
          "Was sind die neuesten HR-Compliance-Vorschriften?"
        ]
      }
    },
    { 
      name: 'Legal', 
      type: 'Legal' as const,
      icon: Scale,
      color: 'bg-purple-100 hover:bg-purple-200 text-purple-700',
      descriptionEn: 'Legal Expert - Contracts, Business Law, Compliance',
      descriptionDe: 'Rechtsexperte - Verträge, Wirtschaftsrecht, Compliance',
      tooltipPrompts: {
        en: [
          "What should be included in an employment contract?",
          "How to protect intellectual property?",
          "What are the key data privacy regulations?",
          "How to handle contract disputes?"
        ],
        de: [
          "Was sollte in einem Arbeitsvertrag enthalten sein?",
          "Wie schütze ich geistiges Eigentum?",
          "Was sind die wichtigsten Datenschutzbestimmungen?",
          "Wie gehe ich mit Vertragsstreitigkeiten um?"
        ]
      }
    },
    { 
      name: 'Designer', 
      type: 'Designer' as const,
      icon: Palette,
      color: 'bg-pink-100 hover:bg-pink-200 text-pink-700',
      descriptionEn: 'Design Expert - UI/UX, Graphics, Branding',
      descriptionDe: 'Design-Experte - UI/UX, Grafikdesign, Branding',
      tooltipPrompts: {
        en: [
          "What are the principles of good UI/UX design?",
          "How to choose the right color palette?",
          "What makes a strong brand identity?",
          "How to improve website accessibility?"
        ],
        de: [
          "Was sind die Prinzipien guten UI/UX-Designs?",
          "Wie wähle ich die richtige Farbpalette?",
          "Was macht eine starke Markenidentität aus?",
          "Wie verbessere ich die Barrierefreiheit einer Website?"
        ]
      }
    }
  ];

  const handlePredefinedPrompt = async (searcher: typeof predefinedSearchers[0], prompt: string) => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    addMessage({ role: 'user', content: prompt });
    
    try {
      const response = await getExpertResponse(searcher.type, prompt);
      
      addMessage({ role: 'assistant', content: response });
    } catch (error) {
      console.error('Failed to get AI response:', error);
      const errorMessage = language === 'en'
        ? 'Sorry, I encountered an error. Please try again.'
        : 'Entschuldigung, ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
      addMessage({ 
        role: 'assistant', 
        content: errorMessage
      });
    } finally {
      setIsLoading(false);
      setHoveredSearcher(null);
    }
  };

  const handlePredefinedSearch = async (searcher: typeof predefinedSearchers[0]) => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    const userMessageContent = language === 'en' 
      ? `[${searcher.name}] How can you help me as a ${searcher.name} expert?`
      : `[${searcher.name}] Wie können Sie mir als ${searcher.name === 'HR' ? 'HR-Experte' : searcher.name === 'Legal' ? 'Rechtsexperte' : 'Design-Experte'} helfen?`;
    
    addMessage({ role: 'user', content: userMessageContent });
    
    try {
      const response = await getExpertResponse(searcher.type);
      
      addMessage({ role: 'assistant', content: response });
    } catch (error) {
      console.error('Failed to get AI response:', error);
      const errorMessage = language === 'en'
        ? 'Sorry, I encountered an error. Please try again.'
        : 'Entschuldigung, ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
      addMessage({ 
        role: 'assistant', 
        content: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    
    addMessage({ role: 'user', content: userMessage });
    
    try {
      let response: string;
      const lowerMessage = userMessage.toLowerCase();
      
      if (lowerMessage.includes('hr') || lowerMessage.includes('recruitment') || lowerMessage.includes('employee') ||
          lowerMessage.includes('personal') || lowerMessage.includes('rekrutierung')) {
        response = await getExpertResponse('HR', userMessage);
      } 
      else if (lowerMessage.includes('legal') || lowerMessage.includes('contract') || lowerMessage.includes('law') ||
               lowerMessage.includes('recht') || lowerMessage.includes('vertrag')) {
        response = await getExpertResponse('Legal', userMessage);
      }
      else if (lowerMessage.includes('design') || lowerMessage.includes('ui') || lowerMessage.includes('ux') ||
               lowerMessage.includes('graphic') || lowerMessage.includes('design') || lowerMessage.includes('typography')) {
        response = await getExpertResponse('Designer', userMessage);
      }
      else {
        const generalPrompt = language === 'en'
          ? `You are a helpful AI assistant. ${userMessage}`
          : `Sie sind ein hilfsbereiter KI-Assistent. ${userMessage}`;
        response = await getGeminiResponse(generalPrompt);
      }
      
      addMessage({ role: 'assistant', content: response });
    } catch (error) {
      console.error('Failed to get AI response:', error);
      const errorMessage = language === 'en'
        ? 'Sorry, I encountered an error. Please try again.'
        : 'Entschuldigung, ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
      addMessage({ 
        role: 'assistant', 
        content: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'de' : 'en');
  };

  if (!isChatOpen) return null;

  return (
    <Card className="fixed bottom-20 right-4 w-1/3 h-3/5 flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          AI Assistant
         
        </CardTitle>
        <div className="flex">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleLanguage} 
            title={language === 'en' ? 'Switch to German' : 'Zu Englisch wechseln'}
            className="mr-1"
          >
            <Globe className="h-4 w-4" />
          </Button>
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
        <div className="w-full mb-3">
          <div className="flex gap-2 justify-center">
            {predefinedSearchers.map((searcher) => {
              const Icon = searcher.icon;
              const description = language === 'en' ? searcher.descriptionEn : searcher.descriptionDe;
              const prompts = language === 'en' ? searcher.tooltipPrompts.en : searcher.tooltipPrompts.de;
              
              return (
                <div 
                  key={searcher.name}
                  className="relative"
                  onMouseEnter={() => setHoveredSearcher(searcher.name)}
                  onMouseLeave={() => setHoveredSearcher(null)}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePredefinedSearch(searcher)}
                    disabled={isLoading}
                    className={`flex flex-col items-center justify-center gap-1 ${searcher.color} border-0 w-20 h-16 py-2`}
                    title={description}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs">{searcher.name}</span>
                  </Button>
                  
                  {hoveredSearcher === searcher.name && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
                      <div className="bg-gray-900 text-white rounded-lg shadow-xl w-64 p-2">
                        <div className="text-xs font-semibold mb-2 px-2 pt-1">
                          {language === 'en' ? 'Suggested Questions:' : 'Vorgeschlagene Fragen:'}
                        </div>
                        <div className="space-y-1">
                          {prompts.map((prompt, idx) => (
                            <button
                              key={idx}
                              onClick={() => handlePredefinedPrompt(searcher, prompt)}
                              disabled={isLoading}
                              className="w-full text-left text-xs px-2 py-1.5 hover:bg-gray-700 rounded transition-colors duration-150"
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                        <div className="border-t border-gray-700 mt-1 pt-1">
                          <div className="text-xs text-gray-400 px-2 py-1">
                            {language === 'en' ? '💡 Click any question to ask' : '💡 Klicken Sie auf eine Frage, um zu fragen'}
                          </div>
                        </div>
                      </div>
                      <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-center text-gray-500 mt-2">
            {language === 'en' 
              ? '✨ Hover over buttons for suggested questions ✨' 
              : '✨ Fahren Sie mit der Maus über die Schaltflächen für vorgeschlagene Fragen ✨'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="flex w-full">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={language === 'en' ? "Ask questions..." : "Fragen stellen..."}
            className="flex-grow mr-2"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
            {language === 'en' ? 'Send' : 'Senden'}
          </Button>
        </form>        
        {/* <div className="mt-2 w-full text-xs text-orange-400 rounded-md text-center">
          {language === 'en' 
            ? '⚠️ AI-generated advice - verify important information' 
            : '⚠️ KI-generierte Beratung - wichtige Informationen überprüfen'}
        </div> */}
      </CardFooter>
    </Card>
  );
};