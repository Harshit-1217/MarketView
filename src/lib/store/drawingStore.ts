import { create } from 'zustand';
import { createClient } from '../supabase/client';

export type DrawingTool = 'crosshair' | 'dot' | 'arrowCursor' | 'eraser' | 'trend' | 'horizontal' | 'vertical' | 'rectangle' | 'fib' | 'text' | 'ray' | 'arrow' | 'brush' | 'ellipse' | 'extendedLine' | 'parallelChannel' | 'triangle' | 'ruler' | 'infoLine' | 'trendAngle' | 'horizontalRay' | 'crossLine' | 'path' | 'curve' | 'fibExtension' | 'pitchfork' | null;

export interface DrawingPoint {
  time: number; // timestamp in seconds
  price: number;
}

export interface DrawingProperties {
  color?: string;
  width?: number;
  text?: string;
  fillColor?: string;
  extendLine?: boolean;
  showPrice?: boolean;
  pricePosition?: 'left' | 'center' | 'right';
}

export interface Drawing {
  id: string;
  symbol: string;
  type: 'trend' | 'horizontal' | 'vertical' | 'rectangle' | 'fib' | 'text' | 'ray' | 'arrow' | 'brush' | 'ellipse' | 'extendedLine' | 'parallelChannel' | 'triangle' | 'ruler' | 'infoLine' | 'trendAngle' | 'horizontalRay' | 'crossLine' | 'path' | 'curve';
  points: DrawingPoint[];
  properties: DrawingProperties;
}

interface DrawingState {
  drawings: Drawing[];
  past: Drawing[][];
  future: Drawing[][];
  activeTool: DrawingTool;
  loading: boolean;
  currentColor: string;
  currentWidth: number;
  
  isMagnetModeEnabled: boolean;
  isDrawingModeLocked: boolean;
  areDrawingsLocked: boolean;
  areDrawingsHidden: boolean;
  
  setActiveTool: (tool: DrawingTool) => void;
  setCurrentColor: (color: string) => void;
  setCurrentWidth: (width: number) => void;
  
  setIsMagnetModeEnabled: (enabled: boolean) => void;
  setIsDrawingModeLocked: (locked: boolean) => void;
  setAreDrawingsLocked: (locked: boolean) => void;
  setAreDrawingsHidden: (hidden: boolean) => void;
  
  addDrawing: (drawing: Omit<Drawing, 'id'>) => Promise<string | undefined>;
  updateDrawing: (id: string, updates: Partial<Drawing>) => Promise<void>;
  deleteDrawing: (id: string) => Promise<void>;
  fetchDrawings: (symbol: string) => Promise<void>;
  clearDrawings: (symbol: string) => Promise<void>;
  undo: () => void;
  redo: () => void;
}

export const useDrawingStore = create<DrawingState>((set, get) => ({
  drawings: [],
  past: [],
  future: [],
  activeTool: 'crosshair',
  loading: false,
  currentColor: '#2962ff',
  currentWidth: 2,
  
  isMagnetModeEnabled: false,
  isDrawingModeLocked: false,
  areDrawingsLocked: false,
  areDrawingsHidden: false,

  setActiveTool: (activeTool) => set({ activeTool }),
  setCurrentColor: (currentColor) => set({ currentColor }),
  setCurrentWidth: (currentWidth) => set({ currentWidth }),
  
  setIsMagnetModeEnabled: (isMagnetModeEnabled) => set({ isMagnetModeEnabled }),
  setIsDrawingModeLocked: (isDrawingModeLocked) => set({ isDrawingModeLocked }),
  setAreDrawingsLocked: (areDrawingsLocked) => set({ areDrawingsLocked }),
  setAreDrawingsHidden: (areDrawingsHidden) => set({ areDrawingsHidden }),

  fetchDrawings: async (symbol) => {
    set({ loading: true });
    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        set({ drawings: [], loading: false });
        return;
      }

      const { data, error } = await supabase
        .from('drawings')
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .eq('user_id', session.user.id);

      if (error) throw error;
      
      set({ 
        drawings: (data || []).map(d => ({
          id: d.id,
          symbol: d.symbol,
          type: d.type as any,
          points: d.points as DrawingPoint[],
          properties: d.properties as DrawingProperties
        }))
      });
    } catch (e) {
      console.error('Error fetching drawings:', e);
    } finally {
      set({ loading: false });
    }
  },

  undo: () => {
    const { past, future, drawings } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    set({
      past: newPast,
      drawings: previous,
      future: [drawings, ...future],
    });
  },

  redo: () => {
    const { past, future, drawings } = get();
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    set({
      past: [...past, drawings],
      drawings: next,
      future: newFuture,
    });
  },

  addDrawing: async (drawingData) => {
    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Fallback for anonymous or unauthenticated mock drawings
        const tempId = `temp-${Date.now()}`;
        set((state) => ({
          past: [...state.past, state.drawings],
          future: [],
          drawings: [...state.drawings, { ...drawingData, id: tempId }]
        }));
        return tempId;
      }

      const newDrawing = {
        user_id: session.user.id,
        symbol: drawingData.symbol.toUpperCase(),
        type: drawingData.type,
        points: drawingData.points,
        properties: drawingData.properties,
      };

      const { data, error } = await supabase
        .from('drawings')
        .insert(newDrawing)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        set((state) => ({
          past: [...state.past, state.drawings],
          future: [],
          drawings: [...state.drawings, {
            id: data.id,
            symbol: data.symbol,
            type: data.type as any,
            points: data.points as DrawingPoint[],
            properties: data.properties as DrawingProperties
          }]
        }));
        return data.id;
      }
    } catch (e) {
      console.error('Error adding drawing:', e);
    }
    return undefined;
  },

  updateDrawing: async (id, updates) => {
    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        set((state) => ({
          past: [...state.past, state.drawings],
          future: [],
          drawings: state.drawings.map(d => d.id === id ? { ...d, ...updates } : d)
        }));
        return;
      }
      
      // Optimistic update
      set((state) => ({
        past: [...state.past, state.drawings],
        future: [],
        drawings: state.drawings.map(d => d.id === id ? { ...d, ...updates } : d)
      }));

      if (id.startsWith('temp-')) return;

      const { error } = await supabase
        .from('drawings')
        .update({
          points: updates.points,
          properties: updates.properties
        })
        .eq('id', id);

      if (error) throw error;
    } catch (e) {
      console.error('Error updating drawing:', e);
    }
  },

  deleteDrawing: async (id) => {
    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        set((state) => ({
          past: [...state.past, state.drawings],
          future: [],
          drawings: state.drawings.filter(d => d.id !== id)
        }));
        return;
      }

      // Optimistic delete
      set((state) => ({
        past: [...state.past, state.drawings],
        future: [],
        drawings: state.drawings.filter(d => d.id !== id)
      }));

      if (id.startsWith('temp-')) return;

      const { error } = await supabase
        .from('drawings')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (e) {
      console.error('Error deleting drawing:', e);
    }
  },

  clearDrawings: async (symbol) => {
    const { drawings } = get();
    const targetDrawings = drawings.filter(d => d.symbol === symbol.toUpperCase());
    
    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        set((state) => ({ 
          past: [...state.past, state.drawings],
          future: [],
          drawings: state.drawings.filter(d => d.symbol !== symbol.toUpperCase()) 
        }));
        return;
      }

      // Optimistic clear
      set((state) => ({
        past: [...state.past, state.drawings],
        future: [],
        drawings: state.drawings.filter(d => d.symbol !== symbol.toUpperCase())
      }));

      const idsToDelete = targetDrawings.filter(d => !d.id.startsWith('temp-')).map(d => d.id);
      if (idsToDelete.length === 0) return;

      const { error } = await supabase
        .from('drawings')
        .delete()
        .in('id', idsToDelete);

      if (error) throw error;
    } catch (e) {
      console.error('Error clearing drawings:', e);
    }
  }
}));
