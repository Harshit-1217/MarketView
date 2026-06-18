'use client';

import React, { useState, useEffect } from 'react';
import { useChartStore } from '@/lib/store/chartStore';
import ChartInstance from './ChartInstance';

interface ChartLayoutProps {
  onOpenIndicators: () => void;
}

export default function ChartLayout({ onOpenIndicators }: ChartLayoutProps) {
  const { layout, charts } = useChartStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      const persistOpt = (useChartStore as any).persist;
      if (persistOpt?.hasHydrated()) {
        setIsHydrated(true);
      } else if (persistOpt?.onFinishHydration) {
        unsub = persistOpt.onFinishHydration(() => setIsHydrated(true));
      } else {
        setIsHydrated(true);
      }
    } catch (e) {
      setIsHydrated(true);
    }
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const getLayoutClasses = () => {
    switch (layout) {
      case '2':
        return 'grid-cols-1 md:grid-cols-2';
      case '4':
        return 'grid-cols-1 md:grid-cols-2 grid-rows-2';
      default:
        return 'grid-cols-1';
    }
  };

  const getRenderedCharts = () => {
    const count = parseInt(layout);
    return charts.slice(0, count);
  };

  const rendered = getRenderedCharts();

  if (!isHydrated) {
    return (
      <div className={`grid gap-2 w-full h-full p-2 bg-background overflow-hidden ${getLayoutClasses()}`}>
        {rendered.map((config) => (
          <div key={config.id} className="w-full h-full border border-border/60 bg-card rounded-xl animate-pulse flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid gap-2 w-full h-full p-2 bg-background overflow-hidden ${getLayoutClasses()}`}>
      {rendered.map((config) => (
        <ChartInstance 
          key={config.id} 
          config={config} 
          onOpenIndicators={onOpenIndicators}
        />
      ))}
    </div>
  );
}
