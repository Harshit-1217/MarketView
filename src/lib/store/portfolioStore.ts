import { create } from 'zustand';
import { createClient } from '../supabase/client';

export interface PortfolioTrade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number | null;
  quantity: number;
  entryDate: string;
  exitDate: string | null;
  pnl: number;
  notes: string;
  status: 'OPEN' | 'CLOSED';
}

interface PortfolioState {
  trades: PortfolioTrade[];
  loading: boolean;

  fetchTrades: () => Promise<void>;
  addTrade: (trade: Omit<PortfolioTrade, 'id' | 'pnl'>) => Promise<void>;
  closeTrade: (id: string, exitPrice: number, exitDate: string) => Promise<void>;
  deleteTrade: (id: string) => Promise<void>;
  getSummary: () => {
    netProfit: number;
    totalTrades: number;
    winRate: number;
    openPositionsCount: number;
    profitFactor: number;
  };
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  trades: [],
  loading: false,

  fetchTrades: async () => {
    set({ loading: true });
    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        set({ trades: [], loading: false });
        return;
      }

      const { data, error } = await supabase
        .from('trade_logs')
        .select('*')
        .eq('user_id', session.user.id)
        .order('entry_date', { ascending: false });

      if (error) throw error;

      const mapped: PortfolioTrade[] = (data || []).map((t) => ({
        id: t.id,
        symbol: t.symbol,
        type: t.type as any,
        entryPrice: Number(t.entry_price),
        exitPrice: t.exit_price ? Number(t.exit_price) : null,
        quantity: Number(t.quantity),
        entryDate: t.entry_date,
        exitDate: t.exit_date,
        pnl: Number(t.pnl),
        notes: t.notes || '',
        status: t.status as any,
      }));

      set({ trades: mapped });
    } catch (e) {
      console.error('Error fetching portfolio trades:', e);
    } finally {
      set({ loading: false });
    }
  },

  addTrade: async (tradeData) => {
    const supabase = createClient();
    
    // Calculate initial PnL if CLOSED
    let pnl = 0;
    if (tradeData.status === 'CLOSED' && tradeData.exitPrice !== null) {
      const diff = tradeData.type === 'BUY'
        ? tradeData.exitPrice - tradeData.entryPrice
        : tradeData.entryPrice - tradeData.exitPrice;
      pnl = diff * tradeData.quantity;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Offline fallback
        const mock: PortfolioTrade = {
          ...tradeData,
          id: `temp-port-${Date.now()}`,
          pnl,
        };
        set((state) => ({ trades: [mock, ...state.trades] }));
        return;
      }

      const { data, error } = await supabase
        .from('trade_logs')
        .insert({
          user_id: session.user.id,
          symbol: tradeData.symbol.toUpperCase(),
          type: tradeData.type,
          entry_price: tradeData.entryPrice,
          exit_price: tradeData.exitPrice,
          quantity: tradeData.quantity,
          entry_date: tradeData.entryDate,
          exit_date: tradeData.exitDate,
          pnl,
          notes: tradeData.notes,
          status: tradeData.status,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newTrade: PortfolioTrade = {
          id: data.id,
          symbol: data.symbol,
          type: data.type as any,
          entryPrice: Number(data.entry_price),
          exitPrice: data.exit_price ? Number(data.exit_price) : null,
          quantity: Number(data.quantity),
          entryDate: data.entry_date,
          exitDate: data.exit_date,
          pnl: Number(data.pnl),
          notes: data.notes || '',
          status: data.status as any,
        };

        set((state) => ({ trades: [newTrade, ...state.trades] }));
      }
    } catch (e) {
      console.error('Error adding portfolio trade:', e);
    }
  },

  closeTrade: async (id, exitPrice, exitDate) => {
    const { trades } = get();
    const trade = trades.find(t => t.id === id);
    if (!trade) return;

    // Calculate final PnL
    const diff = trade.type === 'BUY'
      ? exitPrice - trade.entryPrice
      : trade.entryPrice - exitPrice;
    const pnl = diff * trade.quantity;

    // Optimistic update
    set((state) => ({
      trades: state.trades.map((t) => 
        t.id === id 
          ? { ...t, status: 'CLOSED', exitPrice, exitDate, pnl }
          : t
      )
    }));

    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || id.startsWith('temp-')) return;

      const { error } = await supabase
        .from('trade_logs')
        .update({
          status: 'CLOSED',
          exit_price: exitPrice,
          exit_date: exitDate,
          pnl,
        })
        .eq('id', id);

      if (error) throw error;
    } catch (e) {
      console.error('Error closing trade:', e);
    }
  },

  deleteTrade: async (id) => {
    set((state) => ({
      trades: state.trades.filter(t => t.id !== id),
    }));

    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || id.startsWith('temp-')) return;

      const { error } = await supabase.from('trade_logs').delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error('Error deleting portfolio trade:', e);
    }
  },

  getSummary: () => {
    const { trades } = get();
    const closedTrades = trades.filter(t => t.status === 'CLOSED');
    const totalTrades = closedTrades.length;

    const netProfit = closedTrades.reduce((sum, t) => sum + t.pnl, 0);
    const openPositionsCount = trades.filter(t => t.status === 'OPEN').length;

    if (totalTrades === 0) {
      return { netProfit, totalTrades: 0, winRate: 0, openPositionsCount, profitFactor: 0 };
    }

    const wins = closedTrades.filter(t => t.pnl > 0);
    const losses = closedTrades.filter(t => t.pnl <= 0);
    const winRate = (wins.length / totalTrades) * 100;

    const totalWinsSum = wins.reduce((sum, t) => sum + t.pnl, 0);
    const totalLossSum = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = totalLossSum === 0 ? totalWinsSum : totalWinsSum / totalLossSum;

    return {
      netProfit,
      totalTrades,
      winRate,
      openPositionsCount,
      profitFactor,
    };
  },
}));
