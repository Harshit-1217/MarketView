import React from 'react';
import { Pipette, Trash2 } from 'lucide-react';

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

interface FloatingToolbarProps {
  selectedDrawing: { id: string; x: number; y: number } | null;
  currentColor: string;
  currentWidth: number;
  updateDrawing: (id: string, updates: any) => void;
  setCurrentColor: (color: string) => void;
  setCurrentWidth: (width: number) => void;
  deleteDrawing: (id: string) => void;
  setSelectedDrawing: (drawing: null) => void;
}

export function FloatingToolbar({
  selectedDrawing,
  currentColor,
  currentWidth,
  updateDrawing,
  setCurrentColor,
  setCurrentWidth,
  deleteDrawing,
  setSelectedDrawing,
}: FloatingToolbarProps) {
  if (!selectedDrawing) return null;

  // Clamp the toolbar so it doesn't go off-screen using viewport dimensions
  const toolbarY = Math.max(80, Math.min(selectedDrawing.y - 60, typeof window !== 'undefined' ? window.innerHeight - 60 : 0));
  const toolbarX = Math.max(60, Math.min(selectedDrawing.x - 60, typeof window !== 'undefined' ? window.innerWidth - 180 : 0));
  
  // If the toolbar is too close to the top of the chart, render dropdowns below it
  const isNearTop = toolbarY < 180;
  const colorPopupClass = isNearTop
    ? "absolute left-1/2 -translate-x-1/2 top-full pt-2 opacity-0 pointer-events-none group-hover/floatcolor:opacity-100 group-hover/floatcolor:pointer-events-auto transition-all duration-200 z-[70]"
    : "absolute left-1/2 -translate-x-1/2 bottom-full pb-2 opacity-0 pointer-events-none group-hover/floatcolor:opacity-100 group-hover/floatcolor:pointer-events-auto transition-all duration-200 z-[70]";
  const widthPopupClass = isNearTop
    ? "absolute left-1/2 -translate-x-1/2 top-full pt-2 opacity-0 pointer-events-none group-hover/floatwidth:opacity-100 group-hover/floatwidth:pointer-events-auto transition-all duration-200 z-[70]"
    : "absolute left-1/2 -translate-x-1/2 bottom-full pb-2 opacity-0 pointer-events-none group-hover/floatwidth:opacity-100 group-hover/floatwidth:pointer-events-auto transition-all duration-200 z-[70]";

  return (
    <div 
      className="fixed z-[60] flex items-center gap-1.5 p-1.5 bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-xl animate-in fade-in zoom-in-95 duration-100"
      style={{ top: toolbarY, left: toolbarX }}
    >
      {/* Color Picker */}
      <div className="relative group/floatcolor">
        <button className="w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer hover:bg-white/10" style={{ color: currentColor }}>
          <Pipette className="h-4 w-4" />
        </button>
        <div className={colorPopupClass}>
          <div className="p-2.5 rounded-xl shadow-xl bg-card border border-border min-w-[130px]">
            <div className="grid grid-cols-4 gap-1.5">
              {COLORS.map(({ hex, name }) => (
                <button
                  key={hex}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateDrawing(selectedDrawing.id, { properties: { color: hex } });
                    setCurrentColor(hex);
                  }}
                  title={name}
                  className="h-5 w-5 rounded-md transition-all cursor-pointer hover:scale-110"
                  style={{ background: hex, border: currentColor === hex ? `2px solid white` : '2px solid transparent' }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Width Picker */}
      <div className="relative group/floatwidth">
        <button className="w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer hover:bg-white/10 text-xs font-bold text-muted-foreground">
          {currentWidth}
        </button>
        <div className={widthPopupClass}>
          <div className="p-2 rounded-xl shadow-xl bg-card border border-border min-w-[100px] flex flex-col gap-1">
            {WIDTHS.map(({ w, label }) => (
              <button
                key={w}
                onClick={(e) => {
                  e.stopPropagation();
                  updateDrawing(selectedDrawing.id, { properties: { width: w } });
                  setCurrentWidth(w);
                }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md transition-all cursor-pointer hover:bg-white/5"
              >
                <div className="rounded-full flex-1" style={{ height: `${w * 1.5}px`, background: currentWidth === w ? '#3b82f6' : '#475569' }} />
                <span className="text-[9px] font-semibold text-muted-foreground">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Delete Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          deleteDrawing(selectedDrawing.id);
          setSelectedDrawing(null);
        }}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
