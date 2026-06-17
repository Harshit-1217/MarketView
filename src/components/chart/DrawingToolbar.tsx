'use client';

import React, { useState, useEffect } from 'react';
import { useDrawingStore, DrawingTool } from '@/lib/store/drawingStore';
import { useChartStore } from '@/lib/store/chartStore';
import { 
  MousePointer, 
  Crosshair,
  TrendingUp, 
  Minus, 
  SeparatorVertical, 
  MoveRight,
  ArrowUpRight,
  Square, 
  Circle,
  Brush,
  Percent, 
  Type, 
  Trash2,
  Pipette,
  Magnet,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  PenTool,
  ArrowLeftRight,
  Equal,
  Triangle,
  Ruler,
  Eraser,
  Undo2,
  Redo2,
  MessageSquare,
  MoveDiagonal,
  ArrowRightToLine,
  Plus,
  Waypoints,
  Spline
} from 'lucide-react';

/* ─── Tooltip component ─────────────────────────────────────────────────── */
function Tooltip({ children, label, shortcut, side = 'right' }: {
  children: React.ReactNode;
  label: string;
  shortcut?: string;
  side?: 'right' | 'left' | 'top' | 'bottom';
}) {
  return (
    <div className="relative group/tooltip flex items-center justify-center">
      {children}
      <div
        className={`absolute pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-all duration-150 z-50 whitespace-nowrap
          ${side === 'right' ? 'left-full top-1/2 -translate-y-1/2 ml-3 translate-x-1 group-hover/tooltip:translate-x-0' : ''}
          ${side === 'left' ? 'right-full top-1/2 -translate-y-1/2 mr-3 -translate-x-1 group-hover/tooltip:translate-x-0' : ''}
        `}
      >
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-xl bg-card border border-border text-foreground"
          style={{
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
        {side === 'right' && (
          <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0"
            style={{
              borderTop: '5px solid transparent',
              borderBottom: '5px solid transparent',
              borderRight: '5px solid var(--border)',
            }}
          />
        )}
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

/* ─── Tool Categories ───────────────────────────────────────────────────── */

type ToolItem = { id: DrawingTool | 'select' | null; name: string; shortcut?: string; icon: React.ComponentType<{ className?: string }> };

const CATEGORIES: { id: string; defaultTool: DrawingTool | 'select'; items: ToolItem[] }[] = [
  {
    id: 'cursors',
    defaultTool: 'select',
    items: [
      { id: 'crosshair', name: 'Crosshair', shortcut: 'Esc', icon: Crosshair },
      { id: 'dot', name: 'Dot', icon: Circle }, // Placeholders map to null tool or we can just leave them as UI stubs
      { id: 'arrowCursor', name: 'Arrow', icon: MousePointer },
      { id: 'eraser', name: 'Eraser', icon: Eraser },
    ]
  },
  {
    id: 'lines',
    defaultTool: 'trend',
    items: [
      { id: 'trend', name: 'Trend Line', shortcut: 'T', icon: TrendingUp },
      { id: 'ray', name: 'Ray', icon: MoveRight },
      { id: 'infoLine', name: 'Info Line', icon: MessageSquare },
      { id: 'trendAngle', name: 'Trend Angle', icon: MoveDiagonal },
      { id: 'horizontal', name: 'Horizontal Line', shortcut: 'H', icon: Minus },
      { id: 'horizontalRay', name: 'Horizontal Ray', icon: ArrowRightToLine },
      { id: 'vertical', name: 'Vertical Line', shortcut: 'V', icon: SeparatorVertical },
      { id: 'crossLine', name: 'Cross Line', icon: Plus },
      { id: 'extendedLine', name: 'Extended Line', icon: ArrowLeftRight },
      { id: 'arrow', name: 'Arrow Line', icon: ArrowUpRight },
      { id: 'parallelChannel', name: 'Parallel Channel', icon: Equal },
      { id: 'path', name: 'Path', icon: Waypoints },
      { id: 'curve', name: 'Curve', icon: Spline },
    ]
  },
  {
    id: 'fib',
    defaultTool: 'fib',
    items: [
      { id: 'fib', name: 'Fibonacci Retracement', shortcut: 'F', icon: Percent },
      { id: null, name: 'Trend-Based Fib Extension', icon: Percent },
      { id: null, name: 'Pitchfork', icon: Percent },
    ]
  },
  {
    id: 'shapes',
    defaultTool: 'brush',
    items: [
      { id: 'brush', name: 'Brush', icon: Brush },
      { id: 'rectangle', name: 'Rectangle', shortcut: 'R', icon: Square },
      { id: 'ellipse', name: 'Ellipse', icon: Circle },
      { id: 'triangle', name: 'Triangle', icon: Triangle },
    ]
  },
  {
    id: 'annotations',
    defaultTool: 'text',
    items: [
      { id: 'text', name: 'Text', shortcut: 'A', icon: Type },
      { id: null, name: 'Anchored Text', icon: Type },
      { id: null, name: 'Note', icon: Type },
    ]
  },
  {
    id: 'measure',
    defaultTool: 'ruler',
    items: [
      { id: 'ruler', name: 'Measure', shortcut: 'Shift + Click', icon: Ruler },
    ]
  }
];

export default function DrawingToolbar() {
  const { 
    activeTool, setActiveTool, 
    currentColor, setCurrentColor, 
    currentWidth, setCurrentWidth, 
    clearDrawings,
    isMagnetModeEnabled, setIsMagnetModeEnabled,
    isDrawingModeLocked, setIsDrawingModeLocked,
    areDrawingsLocked, setAreDrawingsLocked,
    areDrawingsHidden, setAreDrawingsHidden,
    undo, redo
  } = useDrawingStore();
  
  const { charts, activeChartId } = useChartStore();
  const activeChart = charts.find(c => c.id === activeChartId);
  const symbol = activeChart?.symbol || 'RELIANCE.NS';

  // Track the last used tool per category so the main icon acts as a quick-select
  const [lastUsedTools, setLastUsedTools] = useState<Record<string, DrawingTool>>({
    cursors: 'crosshair',
    lines: 'trend',
    fib: 'fib',
    shapes: 'brush',
    annotations: 'text',
    measure: 'ruler'
  });

  const [openFlyout, setOpenFlyout] = useState<string | null>(null);

  const handleToolClick = (categoryId: string, toolId: DrawingTool) => {
    if (toolId === null) return; // ignore placeholders
    setLastUsedTools(prev => ({ ...prev, [categoryId]: toolId }));
    setActiveTool(toolId);
    setOpenFlyout(null);
  };

  const handleMainIconClick = (categoryId: string) => {
    const toolId = lastUsedTools[categoryId];
    if (toolId !== null) {
      setActiveTool(toolId);
    }
  };

  const handleClear = () => {
    if (confirm('Clear all drawings on this chart?')) clearDrawings(symbol);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveTool('crosshair');
        setLastUsedTools(prev => ({ ...prev, cursors: 'crosshair' }));
      }
      
      // Undo (Ctrl+Z or Cmd+Z)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          // Redo for Ctrl+Shift+Z
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      }
      
      // Redo (Ctrl+Y or Cmd+Y)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTool, undo, redo]);

  const renderToolButton = (isSelected: boolean, Icon: React.ComponentType<{ className?: string }>, onClick: () => void, isFlyoutItem = false, label = "") => (
    <button
      onClick={onClick}
      className={`relative flex items-center transition-all cursor-pointer overflow-hidden ${
        isFlyoutItem 
          ? `w-full px-3 py-2 gap-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 ${isSelected ? 'text-primary' : 'text-foreground'}`
          : `w-9 h-9 rounded-xl justify-center ${isSelected ? 'bg-primary/20 border border-primary/40 text-primary shadow-[0_0_12px_rgba(59,130,246,0.2)]' : 'bg-transparent border border-transparent text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:border-black/10 dark:hover:border-white/10 hover:text-foreground'}`
      }`}
    >
      {isSelected && !isFlyoutItem && (
        <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }} />
      )}
      <Icon className="h-4 w-4 relative z-10 shrink-0" />
      {isFlyoutItem && <span className="text-sm font-medium whitespace-nowrap">{label}</span>}
    </button>
  );

  return (
    <div
      className="w-[52px] flex flex-col items-center py-3 justify-between h-full shrink-0 select-none relative z-[60] bg-background/90 backdrop-blur-xl border-r border-border"
    >
      {/* ── Top: Tool Categories ─────────────────────────────────────── */}
      <div className="flex flex-col gap-1 w-full px-1.5">
        {CATEGORIES.map(category => {
          const currentCategoryIdTool = lastUsedTools[category.id];
          const activeItem = category.items.find(i => i.id === currentCategoryIdTool) || category.items[0];
          const MainIcon = activeItem.icon;
          
          // Is ANY tool in this category currently active?
          const isCategoryActive = category.items.some(item => item.id !== null && (item.id === activeTool || (activeTool === null && item.id === 'crosshair')));

          return (
            <div 
              key={category.id} 
              className="relative group/category w-full flex justify-center"
              onMouseEnter={() => setOpenFlyout(category.id)}
              onMouseLeave={() => setOpenFlyout(null)}
            >
              <Tooltip label={activeItem.name} shortcut={activeItem.shortcut}>
                {renderToolButton(isCategoryActive, MainIcon, () => handleMainIconClick(category.id))}
              </Tooltip>

              {/* Flyout Menu */}
              {openFlyout === category.id && (
                <div className="absolute left-full top-0 pl-1 z-50 w-[260px]">
                  <div 
                    className="p-1.5 rounded-xl shadow-2xl animate-in fade-in slide-in-from-left-2 duration-150 w-full bg-card/95 border border-border"
                  >
                  {category.items.map((item, idx) => {
                    const isSelected = item.id !== null && (item.id === activeTool || (activeTool === null && item.id === 'crosshair'));
                    return (
                      <div key={idx} className="flex items-center">
                        {renderToolButton(
                          isSelected, 
                          item.icon, 
                          () => handleToolClick(category.id, item.id as DrawingTool),
                          true, 
                          item.name
                        )}
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Bottom: Utilities ──────────────────────── */}
      <div className="flex flex-col gap-1.5 items-center w-full px-1.5">
        
        {/* Color & Width Pickers */}
          <div className="relative group/colorpicker flex justify-center w-full">
            <Tooltip label="Stroke Color">
              <button
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <Pipette className="h-4 w-4" style={{ color: currentColor }} />
              </button>
            </Tooltip>

            <div
              className="absolute left-full bottom-0 pl-3
                opacity-0 pointer-events-none group-hover/colorpicker:opacity-100 group-hover/colorpicker:pointer-events-auto
                transition-all duration-200 z-50"
            >
              <div 
                className="p-3 rounded-2xl shadow-2xl bg-card/95 border border-border min-w-[136px]"
              >
                <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">Color</div>
                <div className="grid grid-cols-4 gap-2">
                  {COLORS.map(({ hex, name }) => (
                    <button
                      key={hex}
                      onClick={() => setCurrentColor(hex)}
                      title={name}
                      className="h-6 w-6 rounded-lg transition-all cursor-pointer hover:scale-110"
                      style={{
                        background: hex,
                        border: currentColor === hex ? `2px solid white` : '2px solid transparent',
                        boxShadow: currentColor === hex ? `0 0 10px ${hex}80` : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="relative group/widthpicker flex justify-center w-full">
            <Tooltip label="Line Width">
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
            </Tooltip>

            <div
              className="absolute left-full bottom-0 pl-3
                opacity-0 pointer-events-none group-hover/widthpicker:opacity-100 group-hover/widthpicker:pointer-events-auto
                transition-all duration-200 z-50"
            >
              <div
                className="p-3 rounded-2xl shadow-2xl bg-card/95 border border-border min-w-[110px]"
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
          </div>

        <div className="w-6 h-px my-1 bg-border" />

        {/* Toggles */}
        <Tooltip label="Magnet Mode">
          {renderToolButton(isMagnetModeEnabled, Magnet, () => setIsMagnetModeEnabled(!isMagnetModeEnabled))}
        </Tooltip>
        
        <Tooltip label="Stay in Drawing Mode">
          {renderToolButton(isDrawingModeLocked, PenTool, () => setIsDrawingModeLocked(!isDrawingModeLocked))}
        </Tooltip>
        
        <Tooltip label={areDrawingsLocked ? "Unlock All Drawings" : "Lock All Drawings"}>
          {renderToolButton(areDrawingsLocked, areDrawingsLocked ? Lock : Unlock, () => setAreDrawingsLocked(!areDrawingsLocked))}
        </Tooltip>
        
        <Tooltip label={areDrawingsHidden ? "Show All Drawings" : "Hide All Drawings"}>
          {renderToolButton(areDrawingsHidden, areDrawingsHidden ? EyeOff : Eye, () => setAreDrawingsHidden(!areDrawingsHidden))}
        </Tooltip>

        <div className="w-6 h-px my-1 bg-border" />

        <Tooltip label="Undo (Ctrl+Z)">
          <button
            onClick={undo}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer"
            style={{ background: 'transparent', border: '1px solid transparent', color: '#64748b' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#e2e8f0'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
          >
            <Undo2 className="h-4 w-4" />
          </button>
        </Tooltip>

        <Tooltip label="Redo (Ctrl+Y)">
          <button
            onClick={redo}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer"
            style={{ background: 'transparent', border: '1px solid transparent', color: '#64748b' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#e2e8f0'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </Tooltip>

        <Tooltip label="Remove All Drawings">
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
