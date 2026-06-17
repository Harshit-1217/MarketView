'use client';

import React from 'react';
import Sidebar from '@/components/shared/Sidebar';
import ScreenerMain from '@/components/screener/ScreenerMain';

export default function ScreenerPage() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground animate-fade-in">
      <div className="flex-1 min-w-0 flex flex-col h-full bg-background">
        <ScreenerMain />
      </div>
      <Sidebar />
    </div>
  );
}
