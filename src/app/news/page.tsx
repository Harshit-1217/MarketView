'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/shared/Sidebar';
import { 
  Newspaper, 
  Search, 
  ExternalLink, 
  Calendar, 
  Tag, 
  Clock,
  RefreshCw 
} from 'lucide-react';

interface Article {
  id: string;
  guid: string;
  title: string;
  url: string;
  imageurl: string;
  source: string;
  body: string;
  tags: string;
  categories: string;
  published_on: number;
}

export default function NewsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fetchNews = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN');
      if (response.ok) {
        const data = await response.json();
        setArticles(data.Data || []);
      }
    } catch (error) {
      console.error('Error fetching crypto news:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const filteredArticles = articles.filter((art) => {
    // Search match
    if (
      search && 
      !art.title.toLowerCase().includes(search.toLowerCase()) && 
      !art.body.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }

    // Category match
    if (categoryFilter !== 'all') {
      const match = art.categories.toLowerCase().includes(categoryFilter) || art.tags.toLowerCase().includes(categoryFilter);
      if (!match) return false;
    }

    return true;
  });

  const categoriesList = [
    { id: 'all', label: 'All Market News' },
    { id: 'btc', label: 'Bitcoin (BTC)' },
    { id: 'eth', label: 'Ethereum (ETH)' },
    { id: 'ico', label: 'ICO & Funding' },
    { id: 'regulation', label: 'Regulation' },
    { id: 'blockchain', label: 'Technology' },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* 1. Navigation Sidebar */}
      <Sidebar />

      {/* 2. Main News feed container */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        {/* Header bar */}
        <div className="h-16 border-b border-border bg-card/40 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-10 w-full select-none">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
              <Newspaper className="h-4.5 w-4.5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Market News Feed</h1>
              <p className="text-[10px] text-muted-foreground">Stay informed with the latest cryptocurrency and regulatory headlines.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchNews}
              title="Refresh news feed"
              className="p-2 bg-secondary border border-border rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filters and Search toolbar */}
        <div className="p-4 border-b border-border bg-card/15 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
          {/* Categories select pills */}
          <div className="flex flex-wrap gap-1.5">
            {categoriesList.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  categoryFilter === cat.id
                    ? 'bg-primary text-white shadow shadow-primary/10'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative flex items-center min-w-[240px]">
            <input
              type="text"
              placeholder="Search news articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-secondary border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition font-medium"
            />
            <Search className="absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>

        {/* Scrollable articles grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-secondary/10">
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-2 border border-dashed border-border rounded-xl">
              <Newspaper className="h-8 w-8 stroke-[1.5]" />
              <span className="text-sm">No articles match your search or filter</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredArticles.map((art) => {
                const dateStr = new Date(art.published_on * 1000).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                
                return (
                  <div 
                    key={art.id} 
                    className="glass rounded-2xl border border-border bg-card overflow-hidden shadow-md flex flex-col justify-between hover:shadow-lg hover:border-primary/20 transition group"
                  >
                    <div>
                      {/* Image header */}
                      {art.imageurl && (
                        <div className="relative h-44 w-full overflow-hidden bg-secondary">
                          <img 
                            src={art.imageurl} 
                            alt={art.title} 
                            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/60 backdrop-blur-sm text-[9px] font-bold text-white uppercase tracking-wider">
                            {art.source}
                          </div>
                        </div>
                      )}

                      {/* Content */}
                      <div className="p-5">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold uppercase mb-2.5">
                          <Calendar className="h-3 w-3" />
                          <span>{dateStr}</span>
                          <span className="h-1 w-1 rounded-full bg-border" />
                          <Tag className="h-3 w-3" />
                          <span className="truncate max-w-[120px]">{art.categories.split('|')[0] || 'Market'}</span>
                        </div>

                        <h3 className="font-bold text-sm text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                          {art.title}
                        </h3>
                        
                        <p className="text-xs text-muted-foreground mt-3 line-clamp-3 leading-relaxed">
                          {art.body}
                        </p>
                      </div>
                    </div>

                    {/* Footer link */}
                    <div className="px-5 pb-5 pt-1">
                      <a
                        href={art.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 bg-secondary border border-border hover:bg-primary/15 hover:border-primary/30 text-foreground hover:text-primary font-semibold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>Read Full Story</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
