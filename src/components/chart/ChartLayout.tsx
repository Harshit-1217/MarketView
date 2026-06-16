'use client';

import React from 'react';
import { useChartStore } from '@/lib/store/chartStore';
import ChartInstance from './ChartInstance';

interface ChartLayoutProps {
  onOpenIndicators: () => void;
}

export default function ChartLayout({ onOpenIndicators }: ChartLayoutProps) {
  const { layout, charts } = useChartStore();

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
