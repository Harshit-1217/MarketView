'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useChartStore } from '@/lib/store/chartStore';
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Filter, 
  TrendingUp, 
  TrendingDown,
  ExternalLink
} from 'lucide-react';

interface TickerData {
  symbol: string;
  lastPrice: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
}

export default function ScreenerMain() {
  const router = useRouter();
  const { activeChartId, updateChartConfig } = useChartStore();

  const [tickers, setTickers] = useState<TickerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Filters
  const [minVolume, setMinVolume] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [changeFilter, setChangeFilter] = useState<'all' | 'positive' | 'negative'>('all');
  
  // Sorting
  const [sortField, setSortField] = useState<keyof TickerData>('quoteVolume');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    async function loadTickers() {
      setLoading(true);
      try {
        const response = await fetch('/api/market/screener');
        if (!response.ok) throw new Error('Screener fetch failed');
        const data = await response.json();
        setTickers(data || []);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }
    loadTickers();
  }, []);

  const handleSort = (field: keyof TickerData) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleOpenInChart = (symbol: string) => {
    updateChartConfig(activeChartId, { symbol });
    router.push('/chart');
  };

  // Filter and Sort tickers
  const filteredTickers = tickers
    .filter((t) => {
      // Search match
      if (search && !t.symbol.toLowerCase().includes(search.toLowerCase())) return false;
      
      // Min volume (Quote volume)
      if (minVolume && t.quoteVolume < parseFloat(minVolume)) return false;
      
      // Min price
      if (minPrice && t.lastPrice < parseFloat(minPrice)) return false;
      
      // Price change filter
      if (changeFilter === 'positive' && t.priceChangePercent <= 0) return false;
      if (changeFilter === 'negative' && t.priceChangePercent >= 0) return false;

      return true;
    })
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

  const formatNumber = (num: number) => {
    if (num >= 1.0e7) return (num / 1.0e7).toFixed(2) + 'Cr';
    if (num >= 1.0e5) return (num / 1.0e5).toFixed(2) + 'L';
    if (num >= 1.0e3) return (num / 1.0e3).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const renderSortIcon = (field: keyof TickerData) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50 ml-1" />;
    return sortAsc 
      ? <ArrowUp className="h-3.5 w-3.5 text-primary ml-1" />
      : <ArrowDown className="h-3.5 w-3.5 text-primary ml-1" />;
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-hidden h-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Market Screener</h1>
          <p className="text-xs text-muted-foreground mt-1">Real-time scan and filters across Top Indian Stocks.</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass rounded-xl p-4 bg-card/40 border border-border/80 flex flex-wrap gap-4 items-center mb-6 shrink-0">
        {/* Search Input */}
        <div className="relative flex items-center min-w-[200px]">
          <input
            type="text"
            placeholder="Search symbol (e.g. RELIANCE)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition font-bold"
          />
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
        </div>

        {/* Min Vol Input */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-semibold">Min Turnover:</span>
          <input
            type="number"
            placeholder="1000000"
            value={minVolume}
            onChange={(e) => setMinVolume(e.target.value)}
            className="w-28 bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
          />
        </div>

        {/* Min Price Input */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-semibold">Min Price (₹):</span>
          <input
            type="number"
            placeholder="10.00"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-24 bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
          />
        </div>

        {/* Change % Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-semibold">Change %:</span>
          <div className="flex bg-secondary p-0.5 rounded-lg border border-border">
            <button
              onClick={() => setChangeFilter('all')}
              className={`px-3 py-1 text-[11px] font-semibold rounded-md transition cursor-pointer ${
                changeFilter === 'all' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setChangeFilter('positive')}
              className={`px-3 py-1 text-[11px] font-semibold rounded-md transition cursor-pointer ${
                changeFilter === 'positive' ? 'bg-bull/20 text-bull' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Positives
            </button>
            <button
              onClick={() => setChangeFilter('negative')}
              className={`px-3 py-1 text-[11px] font-semibold rounded-md transition cursor-pointer ${
                changeFilter === 'negative' ? 'bg-bear/20 text-bear' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Negatives
            </button>
          </div>
        </div>
      </div>

      {/* Grid Table Container */}
      <div className="flex-1 overflow-hidden border border-border rounded-xl bg-card/25 flex flex-col">
        <div className="overflow-auto flex-grow">
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filteredTickers.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Filter className="h-8 w-8 stroke-[1.5]" />
              <span className="text-sm">No pairs match the active filters</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs select-none">
              <thead className="sticky top-0 bg-secondary/85 backdrop-blur border-b border-border z-10 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                <tr>
                  <th 
                    onClick={() => handleSort('symbol')}
                    className="p-4 cursor-pointer hover:text-foreground transition flex items-center"
                  >
                    <span>Symbol</span> {renderSortIcon('symbol')}
                  </th>
                  <th 
                    onClick={() => handleSort('lastPrice')}
                    className="p-4 cursor-pointer hover:text-foreground transition"
                  >
                    <div className="flex items-center">
                      <span>Price (₹)</span> {renderSortIcon('lastPrice')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('priceChangePercent')}
                    className="p-4 cursor-pointer hover:text-foreground transition"
                  >
                    <div className="flex items-center">
                      <span>Daily Change</span> {renderSortIcon('priceChangePercent')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('highPrice')}
                    className="p-4 cursor-pointer hover:text-foreground transition"
                  >
                    <div className="flex items-center">
                      <span>Day High</span> {renderSortIcon('highPrice')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('lowPrice')}
                    className="p-4 cursor-pointer hover:text-foreground transition"
                  >
                    <div className="flex items-center">
                      <span>Day Low</span> {renderSortIcon('lowPrice')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('quoteVolume')}
                    className="p-4 cursor-pointer hover:text-foreground transition"
                  >
                    <div className="flex items-center">
                      <span>Turnover (₹)</span> {renderSortIcon('quoteVolume')}
                    </div>
                  </th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTickers.map((t) => {
                  const isPositive = t.priceChangePercent > 0;
                  return (
                    <tr 
                      key={t.symbol} 
                      className="hover:bg-secondary/25 transition-colors cursor-pointer group"
                      onClick={() => handleOpenInChart(t.symbol)}
                    >
                      <td className="p-4 font-bold text-foreground">{t.symbol}</td>
                      <td className="p-4 font-mono font-semibold text-foreground">₹{t.lastPrice.toFixed(2)}</td>
                      <td className={`p-4 font-mono font-bold ${isPositive ? 'text-bull' : 'text-bear'}`}>
                        <span className="flex items-center gap-1">
                          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {isPositive ? '+' : ''}{t.priceChangePercent.toFixed(2)}%
                        </span>
                      </td>
                      <td className="p-4 font-mono text-muted-foreground">₹{t.highPrice.toFixed(2)}</td>
                      <td className="p-4 font-mono text-muted-foreground">₹{t.lowPrice.toFixed(2)}</td>
                      <td className="p-4 font-mono text-muted-foreground">₹{formatNumber(t.quoteVolume)}</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenInChart(t.symbol);
                          }}
                          className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white rounded-lg text-[10px] font-semibold transition flex items-center gap-1 mx-auto cursor-pointer"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Chart</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
