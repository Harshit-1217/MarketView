'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/shared/Sidebar';
import QuickSettings from '@/components/chart/QuickSettings';
import ChartLayout from '@/components/chart/ChartLayout';
import RightPanel from '@/components/shared/RightPanel';
import IndicatorDialog from '@/components/chart/IndicatorDialog';
import { useChartStore } from '@/lib/store/chartStore';

export default function ChartPage() {
  const [indicatorsOpen, setIndicatorsOpen] = useState(false);
  const activeChartId = useChartStore((state) => state.activeChartId);

  const handleOpenIndicators = () => {
    setIndicatorsOpen(true);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* 1. Left Nav Sidebar */}
      <Sidebar />

      {/* 2. Middle Chart Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <QuickSettings onOpenIndicators={handleOpenIndicators} />
        
        <div className="flex-1 min-h-0 relative">
          <ChartLayout onOpenIndicators={handleOpenIndicators} />
        </div>
      </div>

      {/* 3. Right Sidebar Panel (Watchlist & Alerts) */}
      <RightPanel />

      {/* 4. Overlay Indicators Dialog */}
      <IndicatorDialog
        chartId={activeChartId}
        isOpen={indicatorsOpen}
        onClose={() => setIndicatorsOpen(false)}
      />
    </div>
  );
}
