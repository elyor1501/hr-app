import React from 'react';

export const LoadingDots: React.FC = () => {
  return (
    <div className="flex space-x-1.5 p-1">
      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce shadow-[0_0_5px_rgba(var(--primary),0.5)]" style={{ animationDelay: '0s' }}></div>
      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce shadow-[0_0_5px_rgba(var(--primary),0.5)]" style={{ animationDelay: '0.2s' }}></div>
      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce shadow-[0_0_5px_rgba(var(--primary),0.5)]" style={{ animationDelay: '0.4s' }}></div>
    </div>
  );
};
