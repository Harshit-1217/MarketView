'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/shared/Sidebar';
import QuickSettings from '@/components/chart/QuickSettings';
import ChartLayout from '@/components/chart/ChartLayout';
import RightPanel from '@/components/shared/RightPanel';
import IndicatorDialog from '@/components/chart/IndicatorDialog';
import DrawingToolbar from '@/components/chart/DrawingToolbar';
import { useChartStore } from '@/lib/store/chartStore';

export default function ChartPage() {
  const [indicatorsOpen, setIndicatorsOpen] = useState(false);
  const activeChartId = useChartStore((state) => state.activeChartId);

  const handleOpenIndicators = () => {
    setIndicatorsOpen(true);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* 1. Middle Chart Workspace Area (now on the left) */}
      <div className="flex-1 flex flex-row min-w-0 h-full relative">
        <DrawingToolbar />
        
        <div className="flex-1 flex flex-col min-w-0 h-full relative">
          <div className="relative z-50">
            <QuickSettings onOpenIndicators={handleOpenIndicators} />
          </div>
          
          <div className="flex-1 min-h-0 relative z-0">
            <ChartLayout onOpenIndicators={handleOpenIndicators} />
          </div>
        </div>
      </div>

      {/* 2. Right Side Panels */}
      <div className="flex h-full shrink-0">
        <RightPanel />
        <Sidebar />
      </div>

      {/* 3. Overlay Indicators Dialog */}
      <IndicatorDialog
        chartId={activeChartId}
        isOpen={indicatorsOpen}
        onClose={() => setIndicatorsOpen(false)}
      />
    </div>
  );
}
