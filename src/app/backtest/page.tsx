'use client';

import React from 'react';
import Sidebar from '@/components/shared/Sidebar';
import StrategyEditor from '@/components/backtest/StrategyEditor';
import BacktestResults from '@/components/backtest/BacktestResults';

export default function BacktestPage() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <div className="flex-1 min-w-0 flex flex-col h-full bg-[#131722]">
        <StrategyEditor />
        <BacktestResults />
      </div>
      <Sidebar />
    </div>
  );
}
