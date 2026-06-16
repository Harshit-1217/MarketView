'use client';

import React from 'react';
import Sidebar from '@/components/shared/Sidebar';
import Dashboard from '@/components/portfolio/Dashboard';
import JournalTable from '@/components/portfolio/JournalTable';

export default function PortfolioPage() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col h-full bg-background">
        <Dashboard />
        <JournalTable />
      </div>
    </div>
  );
}
