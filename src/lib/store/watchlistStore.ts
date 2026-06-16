import { create } from 'zustand';
import { createClient } from '../supabase/client';

interface WatchlistState {
  symbols: string[];
  loading: boolean;
  
  fetchWatchlist: () => Promise<void>;
  addSymbol: (symbol: string) => Promise<void>;
  removeSymbol: (symbol: string) => Promise<void>;
}

const DEFAULT_SYMBOLS = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS', 'SBIN.NS'];

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  symbols: DEFAULT_SYMBOLS,
  loading: false,

  fetchWatchlist: async () => {
    set({ loading: true });
    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        set({ symbols: DEFAULT_SYMBOLS, loading: false });
        return;
      }

      // Fetch primary watchlist
      const { data, error } = await supabase
        .from('watchlists')
        .select('symbols')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data && data.symbols) {
        set({ symbols: data.symbols });
      } else {
        // Create initial default watchlist in DB
        await supabase.from('watchlists').insert({
          user_id: session.user.id,
          name: 'Default',
          symbols: DEFAULT_SYMBOLS,
        });
        set({ symbols: DEFAULT_SYMBOLS });
      }
    } catch (e) {
      console.error('Error fetching watchlist:', e);
    } finally {
      set({ loading: false });
    }
  },

  addSymbol: async (symbol) => {
    const sym = symbol.toUpperCase().trim();
    const { symbols } = get();
    if (symbols.includes(sym)) return;

    const updatedSymbols = [...symbols, sym];
    set({ symbols: updatedSymbols });

    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase
        .from('watchlists')
        .update({ symbols: updatedSymbols })
        .eq('user_id', session.user.id);
    } catch (e) {
      console.error('Error adding symbol to watchlist:', e);
    }
  },

  removeSymbol: async (symbol) => {
    const sym = symbol.toUpperCase().trim();
    const { symbols } = get();
    const updatedSymbols = symbols.filter(s => s !== sym);
    
    set({ symbols: updatedSymbols });

    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase
        .from('watchlists')
        .update({ symbols: updatedSymbols })
        .eq('user_id', session.user.id);
    } catch (e) {
      console.error('Error removing symbol from watchlist:', e);
    }
  }
}));
