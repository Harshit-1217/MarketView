import { create } from 'zustand';
import { createClient } from '../supabase/client';

export interface Watchlist {
  id: string;
  name: string;
  symbols: string[];
}

interface WatchlistState {
  watchlists: Watchlist[];
  activeWatchlistId: string | null;
  symbols: string[];
  loading: boolean;
  
  fetchWatchlists: () => Promise<void>;
  fetchWatchlist: () => Promise<void>; // Deprecated alias for backwards compatibility
  createWatchlist: (name: string) => Promise<string | null>;
  renameWatchlist: (id: string, newName: string) => Promise<void>;
  deleteWatchlist: (id: string) => Promise<void>;
  addSymbol: (symbol: string, watchlistId?: string) => Promise<void>;
  removeSymbol: (symbol: string, watchlistId?: string) => Promise<void>;
  setActiveWatchlistId: (id: string) => void;
}

const DEFAULT_SYMBOLS = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS', 'SBIN.NS'];

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  watchlists: [],
  activeWatchlistId: null,
  symbols: DEFAULT_SYMBOLS,
  loading: false,

  fetchWatchlists: async () => {
    set({ loading: true });
    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        set({ 
          watchlists: [], 
          activeWatchlistId: null, 
          symbols: DEFAULT_SYMBOLS, 
          loading: false 
        });
        return;
      }

      // Fetch all watchlists for user
      const { data, error } = await supabase
        .from('watchlists')
        .select('id, name, symbols')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      if (data && data.length > 0) {
        const formattedWatchlists = data.map((wl: any) => ({
          id: wl.id,
          name: wl.name,
          symbols: wl.symbols || [],
        }));

        // Determine which watchlist is currently active or fall back to first
        let activeId = get().activeWatchlistId;
        if (!activeId || !formattedWatchlists.some(wl => wl.id === activeId)) {
          activeId = formattedWatchlists[0].id;
        }

        const activeWatchlist = formattedWatchlists.find(wl => wl.id === activeId);

        set({ 
          watchlists: formattedWatchlists,
          activeWatchlistId: activeId,
          symbols: activeWatchlist ? activeWatchlist.symbols : DEFAULT_SYMBOLS
        });
      } else {
        // Create initial default watchlist in DB
        const { data: insertData, error: insertError } = await supabase
          .from('watchlists')
          .insert({
            user_id: session.user.id,
            name: 'Default',
            symbols: DEFAULT_SYMBOLS,
          })
          .select('id, name, symbols')
          .single();

        if (insertError) throw insertError;

        if (insertData) {
          const newWl = {
            id: insertData.id,
            name: insertData.name,
            symbols: insertData.symbols || [],
          };
          set({ 
            watchlists: [newWl],
            activeWatchlistId: newWl.id,
            symbols: newWl.symbols,
          });
        }
      }
    } catch (e) {
      console.error('Error fetching watchlists:', e);
    } finally {
      set({ loading: false });
    }
  },

  // Backwards compatibility alias
  fetchWatchlist: async () => {
    await get().fetchWatchlists();
  },

  createWatchlist: async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return null;

    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const { data, error } = await supabase
        .from('watchlists')
        .insert({
          user_id: session.user.id,
          name: trimmedName,
          symbols: [],
        })
        .select('id, name, symbols')
        .single();

      if (error) throw error;

      if (data) {
        const newWl: Watchlist = {
          id: data.id,
          name: data.name,
          symbols: data.symbols || [],
        };
        const currentWatchlists = get().watchlists;
        set({
          watchlists: [...currentWatchlists, newWl],
          activeWatchlistId: newWl.id,
          symbols: newWl.symbols,
        });
        return newWl.id;
      }
    } catch (e) {
      console.error('Error creating watchlist:', e);
    }
    return null;
  },

  renameWatchlist: async (id: string, newName: string) => {
    const trimmedName = newName.trim();
    if (!trimmedName) return;

    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('watchlists')
        .update({ name: trimmedName })
        .eq('id', id);

      if (error) throw error;

      const updatedWatchlists = get().watchlists.map(wl => 
        wl.id === id ? { ...wl, name: trimmedName } : wl
      );

      set({ watchlists: updatedWatchlists });
    } catch (e) {
      console.error('Error renaming watchlist:', e);
    }
  },

  deleteWatchlist: async (id: string) => {
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('watchlists')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const currentWatchlists = get().watchlists;
      const updatedWatchlists = currentWatchlists.filter(wl => wl.id !== id);

      // If active was deleted, find a new active watchlist
      let nextActiveId = get().activeWatchlistId;
      if (nextActiveId === id) {
        nextActiveId = updatedWatchlists.length > 0 ? updatedWatchlists[0].id : null;
      }

      const activeWatchlist = updatedWatchlists.find(wl => wl.id === nextActiveId);

      set({
        watchlists: updatedWatchlists,
        activeWatchlistId: nextActiveId,
        symbols: activeWatchlist ? activeWatchlist.symbols : []
      });

      // If no watchlists remain, create a default one
      if (updatedWatchlists.length === 0) {
        await get().fetchWatchlists();
      }
    } catch (e) {
      console.error('Error deleting watchlist:', e);
    }
  },

  addSymbol: async (symbol: string, watchlistId?: string) => {
    const sym = symbol.toUpperCase().trim();
    if (!sym) return;

    const activeId = watchlistId || get().activeWatchlistId;
    if (!activeId) return;

    const targetWatchlist = get().watchlists.find(wl => wl.id === activeId);
    if (!targetWatchlist) return;

    if (targetWatchlist.symbols.includes(sym)) return;

    const updatedSymbols = [...targetWatchlist.symbols, sym];

    // Optimistically update local state
    const updatedWatchlists = get().watchlists.map(wl => 
      wl.id === activeId ? { ...wl, symbols: updatedSymbols } : wl
    );
    
    set({ 
      watchlists: updatedWatchlists,
      symbols: activeId === get().activeWatchlistId ? updatedSymbols : get().symbols 
    });

    const supabase = createClient();
    try {
      await supabase
        .from('watchlists')
        .update({ symbols: updatedSymbols })
        .eq('id', activeId);
    } catch (e) {
      console.error('Error adding symbol to watchlist:', e);
    }
  },

  removeSymbol: async (symbol: string, watchlistId?: string) => {
    const sym = symbol.toUpperCase().trim();
    if (!sym) return;

    const activeId = watchlistId || get().activeWatchlistId;
    if (!activeId) return;

    const targetWatchlist = get().watchlists.find(wl => wl.id === activeId);
    if (!targetWatchlist) return;

    const updatedSymbols = targetWatchlist.symbols.filter(s => s !== sym);

    // Optimistically update local state
    const updatedWatchlists = get().watchlists.map(wl => 
      wl.id === activeId ? { ...wl, symbols: updatedSymbols } : wl
    );

    set({ 
      watchlists: updatedWatchlists,
      symbols: activeId === get().activeWatchlistId ? updatedSymbols : get().symbols 
    });

    const supabase = createClient();
    try {
      await supabase
        .from('watchlists')
        .update({ symbols: updatedSymbols })
        .eq('id', activeId);
    } catch (e) {
      console.error('Error removing symbol from watchlist:', e);
    }
  },

  setActiveWatchlistId: (id: string) => {
    const activeWatchlist = get().watchlists.find(wl => wl.id === id);
    if (!activeWatchlist) return;
    set({
      activeWatchlistId: id,
      symbols: activeWatchlist.symbols,
    });
  },
}));
