import { create } from 'zustand';
import { createClient } from '../supabase/client';

export type DrawingTool = 'trend' | 'horizontal' | 'vertical' | 'rectangle' | 'fib' | 'text' | null;

export interface DrawingPoint {
  time: number; // timestamp in seconds
  price: number;
}

export interface DrawingProperties {
  color?: string;
  width?: number;
  text?: string;
  fillColor?: string;
}

export interface Drawing {
  id: string;
  symbol: string;
  type: 'trend' | 'horizontal' | 'vertical' | 'rectangle' | 'fib' | 'text';
  points: DrawingPoint[];
  properties: DrawingProperties;
}

interface DrawingState {
  drawings: Drawing[];
  activeTool: DrawingTool;
  loading: boolean;
  currentColor: string;
  currentWidth: number;
  
  setActiveTool: (tool: DrawingTool) => void;
  setCurrentColor: (color: string) => void;
  setCurrentWidth: (width: number) => void;
  
  addDrawing: (drawing: Omit<Drawing, 'id'>) => Promise<void>;
  updateDrawing: (id: string, updates: Partial<Drawing>) => Promise<void>;
  deleteDrawing: (id: string) => Promise<void>;
  fetchDrawings: (symbol: string) => Promise<void>;
  clearDrawings: (symbol: string) => Promise<void>;
}

export const useDrawingStore = create<DrawingState>((set, get) => ({
  drawings: [],
  activeTool: null,
  loading: false,
  currentColor: '#2962ff',
  currentWidth: 2,

  setActiveTool: (activeTool) => set({ activeTool }),
  setCurrentColor: (currentColor) => set({ currentColor }),
  setCurrentWidth: (currentWidth) => set({ currentWidth }),

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

  addDrawing: async (drawingData) => {
    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Fallback for anonymous or unauthenticated mock drawings
        const tempId = `temp-${Date.now()}`;
        set((state) => ({
          drawings: [...state.drawings, { ...drawingData, id: tempId }]
        }));
        return;
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
          drawings: [...state.drawings, {
            id: data.id,
            symbol: data.symbol,
            type: data.type as any,
            points: data.points as DrawingPoint[],
            properties: data.properties as DrawingProperties
          }]
        }));
      }
    } catch (e) {
      console.error('Error adding drawing:', e);
    }
  },

  updateDrawing: async (id, updates) => {
    // Optimistic update
    set((state) => ({
      drawings: state.drawings.map(d => d.id === id ? { ...d, ...updates } : d)
    }));

    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || id.startsWith('temp-')) return;

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
    // Optimistic delete
    set((state) => ({
      drawings: state.drawings.filter(d => d.id !== id)
    }));

    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || id.startsWith('temp-')) return;

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
    
    // Optimistic clear
    set((state) => ({
      drawings: state.drawings.filter(d => d.symbol !== symbol.toUpperCase())
    }));

    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

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
