import { create } from 'zustand';
import { createClient } from '../supabase/client';

export interface Alert {
  id: string;
  symbol: string;
  type: 'price' | 'indicator';
  condition: 'above' | 'below';
  value: number;
  isTriggered: boolean;
  createdAt: string;
  triggeredAt?: string | null;
}

interface AlertState {
  alerts: Alert[];
  loading: boolean;
  history: Alert[];

  fetchAlerts: () => Promise<void>;
  createAlert: (alert: Omit<Alert, 'id' | 'isTriggered' | 'createdAt' | 'triggeredAt'>) => Promise<void>;
  deleteAlert: (id: string) => Promise<void>;
  checkAlerts: (symbol: string, currentPrice: number) => void;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],
  loading: false,
  history: [],

  fetchAlerts: async () => {
    set({ loading: true });
    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        set({ alerts: [], history: [], loading: false });
        return;
      }

      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: Alert[] = (data || []).map((a) => ({
        id: a.id,
        symbol: a.symbol,
        type: a.type as any,
        condition: a.condition as any,
        value: Number(a.value),
        isTriggered: a.is_triggered,
        createdAt: a.created_at,
        triggeredAt: a.triggered_at,
      }));

      set({
        alerts: mapped.filter((a) => !a.isTriggered),
        history: mapped.filter((a) => a.isTriggered),
      });
    } catch (e) {
      console.error('Error fetching alerts:', e);
    } finally {
      set({ loading: false });
    }
  },

  createAlert: async (alertData) => {
    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Mock offline fallback
        const mock: Alert = {
          ...alertData,
          id: `temp-alert-${Date.now()}`,
          isTriggered: false,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ alerts: [mock, ...state.alerts] }));
        return;
      }

      const { data, error } = await supabase
        .from('alerts')
        .insert({
          user_id: session.user.id,
          symbol: alertData.symbol.toUpperCase(),
          type: alertData.type,
          condition: alertData.condition,
          value: alertData.value,
          is_triggered: false,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newAlert: Alert = {
          id: data.id,
          symbol: data.symbol,
          type: data.type as any,
          condition: data.condition as any,
          value: Number(data.value),
          isTriggered: data.is_triggered,
          createdAt: data.created_at,
        };

        set((state) => ({ alerts: [newAlert, ...state.alerts] }));
      }
    } catch (e) {
      console.error('Error creating alert:', e);
    }
  },

  deleteAlert: async (id) => {
    // Optimistic delete
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id),
      history: state.history.filter((a) => a.id !== id),
    }));

    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || id.startsWith('temp-')) return;

      const { error } = await supabase.from('alerts').delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error('Error deleting alert:', e);
    }
  },

  checkAlerts: (symbol, currentPrice) => {
    const { alerts } = get();
    const sym = symbol.toUpperCase();
    
    // Find matching active alerts
    const triggered = alerts.filter((a) => {
      if (a.symbol !== sym) return false;
      if (a.condition === 'above' && currentPrice >= a.value) return true;
      if (a.condition === 'below' && currentPrice <= a.value) return true;
      return false;
    });

    if (triggered.length === 0) return;

    // Trigger local audio or visual alerts
    triggered.forEach((alert) => {
      // Audio Alert Beep
      if (typeof window !== 'undefined') {
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.connect(gain);
          gain.connect(audioContext.destination);
          
          osc.type = 'sine';
          osc.frequency.value = 880; // A5 note (nice clean chime)
          gain.gain.setValueAtTime(0.3, audioContext.currentTime);
          
          osc.start();
          osc.stop(audioContext.currentTime + 0.3); // play for 300ms
        } catch (err) {
          // Ignore audio blocked contexts
        }

        // Show window alert
        window.alert(`🚨 ALERT TRIGGERED!\n${alert.symbol} price crossed ${alert.condition} ${alert.value}`);
      }

      // Update local state: move to history
      const nowStr = new Date().toISOString();
      const updatedAlert = { ...alert, isTriggered: true, triggeredAt: nowStr };

      set((state) => ({
        alerts: state.alerts.filter((a) => a.id !== alert.id),
        history: [updatedAlert, ...state.history],
      }));

      // Persist triggered status to Supabase
      const supabase = createClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session || alert.id.startsWith('temp-')) return;
        supabase
          .from('alerts')
          .update({ is_triggered: true, triggered_at: nowStr })
          .eq('id', alert.id)
          .then(({ error }) => {
            if (error) console.error('Failed to update alert trigger in DB:', error);
          });
      });
    });
  },
}));
