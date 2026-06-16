'use client';

import React from 'react';
import { useDrawingStore, DrawingTool } from '@/lib/store/drawingStore';
import { useChartStore } from '@/lib/store/chartStore';
import { 
  MousePointer, 
  TrendingUp, 
  Minus, 
  SeparatorVertical, 
  Square, 
  Percent, 
  Type, 
  Trash2,
  Palette
} from 'lucide-react';

export default function DrawingToolbar() {
  const { 
    activeTool, 
    setActiveTool, 
    currentColor, 
    setCurrentColor, 
    currentWidth, 
    setCurrentWidth,
    clearDrawings
  } = useDrawingStore();

  const { charts, activeChartId } = useChartStore();
  const activeChart = charts.find(c => c.id === activeChartId);
  const symbol = activeChart?.symbol || 'BTCUSDT';

  const tools: { id: DrawingTool | 'select'; name: string; icon: React.ComponentType<any> }[] = [
    { id: 'select', name: 'Cursor Mode', icon: MousePointer },
    { id: 'trend', name: 'Trend Line', icon: TrendingUp },
    { id: 'horizontal', name: 'Horizontal Line', icon: Minus },
    { id: 'vertical', name: 'Vertical Line', icon: SeparatorVertical },
    { id: 'rectangle', name: 'Rectangle', icon: Square },
    { id: 'fib', name: 'Fibonacci Retracement', icon: Percent },
    { id: 'text', name: 'Text Annotation', icon: Type },
  ];

  const colors = [
    '#2962ff', // default blue
    '#089981', // green
    '#f23645', // red
    '#e7c617', // yellow
    '#ab47bc', // purple
    '#ffffff', // white
  ];

  const handleToolClick = (toolId: DrawingTool | 'select') => {
    if (toolId === 'select') {
      setActiveTool(null);
    } else {
      setActiveTool(toolId);
    }
  };

  const handleClear = () => {
    if (confirm('Clear all drawings on this chart?')) {
      clearDrawings(symbol);
    }
  };

  return (
    <div className="w-12 border-r border-border bg-card/80 backdrop-blur-md flex flex-col items-center py-3 justify-between h-full shrink-0 select-none z-10">
      <div className="flex flex-col gap-2 w-full px-1.5">
        {tools.map((tool) => {
          const isSelected = (tool.id === 'select' && activeTool === null) || activeTool === tool.id;
          const Icon = tool.icon;
          return (
            <button
              key={tool.name}
              onClick={() => handleToolClick(tool.id)}
              title={tool.name}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer relative group ${
                isSelected 
                  ? 'bg-primary/20 text-primary border border-primary/30 shadow-md shadow-primary/5' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
              }`}
            >
              <Icon className="h-4.5 w-4.5" />
              <span className="absolute left-14 px-2 py-1 bg-popover text-foreground text-xs rounded border border-border opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-25">
                {tool.name}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 items-center w-full px-1.5">
        {/* Colors Picker */}
        <div className="relative group">
          <button className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition cursor-pointer">
            <Palette className="h-4.5 w-4.5" style={{ color: currentColor }} />
          </button>
          <div className="absolute left-14 bottom-0 p-2 bg-popover rounded-xl border border-border shadow-xl hidden group-hover:grid grid-cols-3 gap-1.5 z-25">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setCurrentColor(c)}
                className="w-5 h-5 rounded-full border border-border transition hover:scale-110 cursor-pointer"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Width Picker */}
        <div className="relative group">
          <button className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition font-bold text-xs cursor-pointer">
            {currentWidth}px
          </button>
          <div className="absolute left-14 bottom-0 p-2 bg-popover rounded-xl border border-border shadow-xl hidden group-hover:flex flex-col gap-1 z-25">
            {[1, 2, 4].map((w) => (
              <button
                key={w}
                onClick={() => setCurrentWidth(w)}
                className={`px-3 py-1 rounded text-xs hover:bg-secondary transition cursor-pointer ${
                  currentWidth === w ? 'text-primary font-semibold' : 'text-foreground'
                }`}
              >
                {w}px
              </button>
            ))}
          </div>
        </div>

        {/* Trash bin to clear */}
        <button
          onClick={handleClear}
          title="Clear all drawings"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
        >
          <Trash2 className="h-4.5 w-4.5" />
        </button>
      </div>
    </div>
  );
}
