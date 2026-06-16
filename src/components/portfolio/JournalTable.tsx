'use client';

import React, { useState, useEffect } from 'react';
import { usePortfolioStore, PortfolioTrade } from '@/lib/store/portfolioStore';
import { 
  Plus, 
  Trash2, 
  CheckCircle, 
  Clock, 
  Calendar,
  DollarSign,
  TrendingUp,
  FileText
} from 'lucide-react';

export default function JournalTable() {
  const { trades, loading, fetchTrades, addTrade, closeTrade, deleteTrade } = usePortfolioStore();

  // Dialog State
  const [formOpen, setFormOpen] = useState(false);
  const [closeModal, setCloseModal] = useState<{ open: boolean; tradeId: string } | null>(null);

  // Form inputs
  const [symbol, setSymbol] = useState('');
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
  const [entryPrice, setEntryPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [exitPrice, setExitPrice] = useState('');

  // Close position inputs
  const [closePrice, setClosePrice] = useState('');

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ep = parseFloat(entryPrice);
    const qty = parseFloat(quantity);
    const exp = exitPrice ? parseFloat(exitPrice) : null;

    if (isNaN(ep) || isNaN(qty) || qty <= 0) return;

    await addTrade({
      symbol: symbol.toUpperCase().trim(),
      type,
      entryPrice: ep,
      exitPrice: status === 'CLOSED' ? exp : null,
      quantity: qty,
      entryDate: new Date().toISOString(),
      exitDate: status === 'CLOSED' ? new Date().toISOString() : null,
      notes: notes.trim(),
      status,
    });

    // Reset Form
    setSymbol('');
    setEntryPrice('');
    setQuantity('');
    setNotes('');
    setStatus('OPEN');
    setExitPrice('');
    setFormOpen(false);
  };

  const handleClosePositionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closeModal) return;
    const cp = parseFloat(closePrice);
    if (isNaN(cp)) return;

    await closeTrade(closeModal.tradeId, cp, new Date().toISOString());
    setClosePrice('');
    setCloseModal(null);
  };

  return (
    <div className="flex-1 p-6 overflow-hidden flex flex-col min-h-0 bg-background select-none">
      {/* Journal Table Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="h-4.5 w-4.5 text-primary" />
          <span>Trading Journal Logs</span>
        </h2>
        
        <button
          onClick={() => setFormOpen(true)}
          className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Journal Entry</span>
        </button>
      </div>

      {/* Main Journal Data Table container */}
      <div className="flex-1 overflow-hidden border border-border rounded-xl bg-card/25 flex flex-col">
        <div className="overflow-auto flex-grow">
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : trades.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-2 border border-dashed border-border rounded-xl m-4">
              <Calendar className="h-8 w-8 stroke-[1.5]" />
              <span className="text-xs">Your trading ledger is empty. Click New Journal Entry above to log trades.</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-secondary/80 backdrop-blur border-b border-border z-10 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                <tr>
                  <th className="p-4">Asset</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Qty</th>
                  <th className="p-4">Entry price</th>
                  <th className="p-4">Exit price</th>
                  <th className="p-4">PnL ($)</th>
                  <th className="p-4">Entry Date</th>
                  <th className="p-4 max-w-[200px]">Notes</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {trades.map((t) => {
                  const isClosed = t.status === 'CLOSED';
                  const isPositive = t.pnl > 0;
                  
                  return (
                    <tr key={t.id} className="hover:bg-secondary/25 transition-colors">
                      <td className="p-4 font-bold text-foreground">{t.symbol}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.type === 'BUY' ? 'bg-bull/15 text-bull' : 'bg-bear/15 text-bear'
                        }`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                          isClosed ? 'text-muted-foreground' : 'text-amber-500'
                        }`}>
                          {isClosed ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {t.status}
                        </span>
                      </td>
                      <td className="p-4 font-mono">{t.quantity}</td>
                      <td className="p-4 font-mono font-semibold">${t.entryPrice.toFixed(2)}</td>
                      <td className="p-4 font-mono text-muted-foreground">
                        {t.exitPrice ? `$${t.exitPrice.toFixed(2)}` : '---'}
                      </td>
                      <td className={`p-4 font-mono font-bold ${
                        !isClosed ? 'text-muted-foreground' : isPositive ? 'text-bull' : 'text-bear'
                      }`}>
                        {!isClosed ? '---' : `${isPositive ? '+' : ''}${t.pnl.toFixed(2)}`}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(t.entryDate).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-muted-foreground truncate max-w-[200px]" title={t.notes}>
                        {t.notes || <span className="italic text-muted-foreground/40">No description</span>}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {!isClosed && (
                            <button
                              onClick={() => setCloseModal({ open: true, tradeId: t.id })}
                              className="px-2 py-1 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white rounded text-[10px] font-semibold transition cursor-pointer"
                            >
                              Close Position
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (confirm('Delete this trade record?')) deleteTrade(t.id);
                            }}
                            className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-destructive/10 transition cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* New Entry Modal Dialog */}
      {formOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass w-full max-w-md rounded-2xl shadow-2xl border border-border bg-card">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold text-foreground">Add Journal Entry</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Record a manual execution in your portfolio ledger.</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Asset Pair</label>
                  <input
                    type="text"
                    required
                    placeholder="BTCUSDT"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="bg-secondary/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary uppercase font-bold"
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Action Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="bg-secondary/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-bold"
                  >
                    <option value="BUY">BUY LONG</option>
                    <option value="SELL">SELL SHORT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Entry Price</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="65000.00"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    className="bg-secondary/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-mono font-semibold"
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Quantity Size</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.05"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="bg-secondary/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-mono font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="bg-secondary/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-semibold"
                  >
                    <option value="OPEN">OPEN (Floating)</option>
                    <option value="CLOSED">CLOSED (Realized)</option>
                  </select>
                </div>

                {status === 'CLOSED' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Exit Price</label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="68000.00"
                      value={exitPrice}
                      onChange={(e) => setExitPrice(e.target.value)}
                      className="bg-secondary/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-mono font-semibold"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Trade Journal Notes</label>
                <textarea
                  placeholder="Reason for entry, indicator crosses, target targets..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-secondary/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary w-full h-16 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 border border-border hover:bg-secondary rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white hover:bg-primary/95 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Log Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Position Modal Dialog */}
      {closeModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass w-full max-w-sm rounded-2xl shadow-2xl border border-border bg-card">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold text-foreground">Close Position</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Realize the floating position by executing exit pricing.</p>
            </div>

            <form onSubmit={handleClosePositionSubmit} className="p-6 space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Exit Price</label>
                <input
                  autoFocus
                  type="number"
                  step="any"
                  required
                  placeholder="Enter exit price (e.g. 66000.00)"
                  value={closePrice}
                  onChange={(e) => setClosePrice(e.target.value)}
                  className="bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-mono font-semibold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCloseModal(null)}
                  className="px-4 py-2 border border-border hover:bg-secondary rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white hover:bg-primary/95 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Close Position
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
