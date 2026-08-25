'use client';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  noPadding?: boolean;
  className?: string;
}

export default function Card({ children, title, noPadding = false, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${noPadding ? '' : 'p-6'} w-full transition-all ${className}`}>
      {title && (
        <div className={`mb-4 border-b border-gray-100 pb-3 ${noPadding ? 'p-6 pb-3' : ''}`}>
          <h3 className="text-[#00388d] font-bold text-sm md:text-base tracking-tight">{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}
