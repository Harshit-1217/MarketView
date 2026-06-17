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
  Pipette
} from 'lucide-react';

/* ─── Tooltip component ─────────────────────────────────────────────────── */
function Tooltip({ children, label, shortcut }: {
  children: React.ReactNode;
  label: string;
  shortcut?: string;
}) {
  return (
    <div className="relative group/tooltip">
      {children}
      <div
        className="absolute left-full top-1/2 -translate-y-1/2 ml-3 pointer-events-none
          opacity-0 group-hover/tooltip:opacity-100 transition-all duration-150
          translate-x-1 group-hover/tooltip:translate-x-0 z-50 whitespace-nowrap"
      >
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-xl"
          style={{
            background: 'rgba(13,17,23,0.97)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#e2e8f0',
            boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
          }}
        >
          {label}
          {shortcut && (
            <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}>
              {shortcut}
            </kbd>
          )}
        </div>
        {/* Arrow */}
        <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0"
          style={{
            borderTop: '5px solid transparent',
            borderBottom: '5px solid transparent',
            borderRight: '5px solid rgba(255,255,255,0.1)',
          }}
        />
      </div>
    </div>
  );
}

/* ─── Color swatch ──────────────────────────────────────────────────────── */
const COLORS = [
  { hex: '#3b82f6', name: 'Blue' },
  { hex: '#10b981', name: 'Green' },
  { hex: '#ef4444', name: 'Red' },
  { hex: '#f59e0b', name: 'Amber' },
  { hex: '#8b5cf6', name: 'Purple' },
  { hex: '#06b6d4', name: 'Cyan' },
  { hex: '#ec4899', name: 'Pink' },
  { hex: '#f97316', name: 'Orange' },
  { hex: '#ffffff', name: 'White' },
];

const WIDTHS = [
  { w: 1, label: 'Thin' },
  { w: 2, label: 'Medium' },
  { w: 4, label: 'Thick' },
];

export default function DrawingToolbar() {
  const { activeTool, setActiveTool, currentColor, setCurrentColor, currentWidth, setCurrentWidth, clearDrawings } = useDrawingStore();
  const { charts, activeChartId } = useChartStore();
  const activeChart = charts.find(c => c.id === activeChartId);
  const symbol = activeChart?.symbol || 'RELIANCE.NS';

  const tools: { id: DrawingTool | 'select'; name: string; shortcut?: string; icon: React.ComponentType<any> }[] = [
    { id: 'select',     name: 'Select / Cursor',        shortcut: 'Esc', icon: MousePointer },
    { id: 'trend',      name: 'Trend Line',             shortcut: 'T',   icon: TrendingUp },
    { id: 'horizontal', name: 'Horizontal Line',        shortcut: 'H',   icon: Minus },
    { id: 'vertical',   name: 'Vertical Line',          shortcut: 'V',   icon: SeparatorVertical },
    { id: 'rectangle',  name: 'Rectangle',              shortcut: 'R',   icon: Square },
    { id: 'fib',        name: 'Fibonacci Retracement',  shortcut: 'F',   icon: Percent },
    { id: 'text',       name: 'Text Annotation',        shortcut: 'A',   icon: Type },
  ];

  const handleToolClick = (toolId: DrawingTool | 'select') => {
    setActiveTool(toolId === 'select' ? null : toolId);
  };

  const handleClear = () => {
    if (confirm('Clear all drawings on this chart?')) clearDrawings(symbol);
  };

  return (
    <div
      className="w-12 flex flex-col items-center py-3 justify-between h-full shrink-0 select-none"
      style={{
        background: 'rgba(5,8,17,0.88)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* ── Tool buttons ─────────────────────────────────────── */}
      <div className="flex flex-col gap-1 w-full px-1.5">
        {tools.map(tool => {
          const isSelected = (tool.id === 'select' && activeTool === null) || activeTool === tool.id;
          const Icon = tool.icon;
          return (
            <Tooltip key={tool.id} label={tool.name} shortcut={tool.shortcut}>
              <button
                onClick={() => handleToolClick(tool.id)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer relative overflow-hidden"
                style={isSelected
                  ? {
                    background: 'rgba(59,130,246,0.2)',
                    border: '1px solid rgba(59,130,246,0.4)',
                    color: '#3b82f6',
                    boxShadow: '0 0 12px rgba(59,130,246,0.2)',
                  }
                  : {
                    background: 'transparent',
                    border: '1px solid transparent',
                    color: '#64748b',
                  }
                }
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.color = '#e2e8f0';
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.color = '#64748b';
                  }
                }}
              >
                {isSelected && (
                  <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }} />
                )}
                <Icon className="h-4 w-4 relative z-10" />
              </button>
            </Tooltip>
          );
        })}
      </div>

      {/* ── Bottom: Color, Width, Clear ──────────────────────── */}
      <div className="flex flex-col gap-2 items-center w-full px-1.5">
        {/* Active color indicator + picker */}
        <Tooltip label="Stroke Color">
          <div className="relative group/colorpicker">
            <button
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Pipette className="h-4 w-4" style={{ color: currentColor }} />
            </button>

            {/* Color picker flyout */}
            <div
              className="absolute left-full bottom-0 ml-3 p-3 rounded-2xl shadow-2xl
                opacity-0 pointer-events-none group-hover/colorpicker:opacity-100 group-hover/colorpicker:pointer-events-auto
                transition-all duration-200 z-50"
              style={{
                background: 'rgba(13,17,23,0.98)',
                border: '1px solid rgba(255,255,255,0.1)',
                minWidth: '136px',
              }}
            >
              <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Color</div>
              <div className="grid grid-cols-3 gap-1.5">
                {COLORS.map(({ hex, name }) => (
                  <button
                    key={hex}
                    onClick={() => setCurrentColor(hex)}
                    title={name}
                    className="h-6 w-6 rounded-lg transition-all cursor-pointer hover:scale-110"
                    style={{
                      background: hex,
                      border: currentColor === hex
                        ? `2px solid white`
                        : '2px solid transparent',
                      boxShadow: currentColor === hex ? `0 0 10px ${hex}80` : 'none',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </Tooltip>

        {/* Width picker */}
        <Tooltip label="Line Width">
          <div className="relative group/widthpicker">
            <button
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer font-bold text-xs"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#94a3b8',
              }}
            >
              {currentWidth}
            </button>

            <div
              className="absolute left-full bottom-0 ml-3 p-3 rounded-2xl shadow-2xl
                opacity-0 pointer-events-none group-hover/widthpicker:opacity-100 group-hover/widthpicker:pointer-events-auto
                transition-all duration-200 z-50"
              style={{
                background: 'rgba(13,17,23,0.98)',
                border: '1px solid rgba(255,255,255,0.1)',
                minWidth: '110px',
              }}
            >
              <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Width</div>
              <div className="flex flex-col gap-1.5">
                {WIDTHS.map(({ w, label }) => (
                  <button
                    key={w}
                    onClick={() => setCurrentWidth(w)}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-all cursor-pointer w-full"
                    style={currentWidth === w
                      ? { background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }
                      : { color: '#94a3b8' }
                    }
                    onMouseEnter={e => { if (currentWidth !== w) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={e => { if (currentWidth !== w) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div className="rounded-full flex-1"
                      style={{ height: `${w * 1.5}px`, background: currentWidth === w ? '#3b82f6' : '#475569' }} />
                    <span className="text-[10px] font-semibold shrink-0">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Tooltip>

        {/* Divider */}
        <div className="w-6 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />

        {/* Clear drawings */}
        <Tooltip label="Clear All Drawings">
          <button
            onClick={handleClear}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer"
            style={{ background: 'transparent', border: '1px solid transparent', color: '#64748b' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
