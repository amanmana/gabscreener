/**
 * Yahoo Finance Provider — High Fidelity Market Data
 * Enhanced with Cloudflare Worker Proxy Support to bypass Vercel IP blocks.
 */

import { NormalizedMarketData, MarketDataProvider, DataSource } from "./types";

export class YahooProvider implements MarketDataProvider {
  readonly source: DataSource = "yahoo";

  private getProxyUrl(ticker: string, endpoint: 'quote' | 'chart' | 'v7' = 'quote'): string | null {
    const proxyBase = process.env.YAHOO_PROXY_URL || process.env.NEXT_PUBLIC_YAHOO_PROXY_URL;
    if (!proxyBase) return null;
    
    // Ensure no trailing slash on base
    const base = proxyBase.replace(/\/$/, "");
    return `${base}?ticker=${ticker}&endpoint=${endpoint}`;
  }

  async fetchQuote(ticker: string): Promise<NormalizedMarketData | null> {
    const proxyUrl = this.getProxyUrl(ticker, 'chart');
    
    // 1. Try via Proxy first (Best for Vercel/Production)
    if (proxyUrl) {
      try {
        console.log(`[yahoo] fetching via proxy: ${ticker}`);
        const res = await fetch(proxyUrl, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          return this.normalizeChartData(ticker, data);
        }
        console.warn(`[yahoo] proxy fetch failed for ${ticker}: ${res.status}`);
      } catch (err) {
        console.error(`[yahoo] proxy error for ${ticker}:`, err);
      }
    }

    // 2. Fallback to direct fetch (Best for Local/Development)
    try {
      console.log(`[yahoo] falling back to direct fetch: ${ticker}`);
      const directUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m&range=1d`;
      const res = await fetch(directUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        cache: 'no-store'
      });

      if (!res.ok) throw new Error(`Yahoo returned ${res.status}`);
      const data = await res.json();
      return this.normalizeChartData(ticker, data);
    } catch (err) {
      console.error(`[yahoo] direct fetch failed for ${ticker}:`, err);
      return null;
    }
  }

  async fetchQuotes(tickers: string[]): Promise<NormalizedMarketData[]> {
    const results = await Promise.all(tickers.map(t => this.fetchQuote(t)));
    return results.filter((r): r is NormalizedMarketData => r !== null);
  }

  private normalizeChartData(symbol: string, raw: any): NormalizedMarketData | null {
    try {
      const result = raw.chart?.result?.[0];
      if (!result) return null;

      const meta = result.meta;
      const indicators = result.indicators.quote[0];
      
      const prevClose = meta.previousClose;
      const currentPrice = meta.regularMarketPrice;
      const open = meta.regularMarketOpen || indicators.open?.[0];
      
      // Calculate gap if we have enough data
      let gapPct = 0;
      if (prevClose && currentPrice) {
        gapPct = ((currentPrice - prevClose) / prevClose) * 100;
      }

      return {
        symbol,
        currentPrice,
        previousClose: prevClose,
        open: open || currentPrice,
        high: Math.max(...(indicators.high?.filter((v:any) => v != null) || [currentPrice])),
        low: Math.min(...(indicators.low?.filter((v:any) => v != null) || [currentPrice])),
        premarketVolume: null, // Chart endpoint doesn't usually provide PM Vol, will need 'v7' or 'quote' for that
        gapPct,
        dataTimestamp: new Date(meta.regularMarketTime * 1000),
        dataSource: "yahoo",
        calculationMode: "premarket", // Since we use chart data, we consider it high fidelity
        isStale: false
      };
    } catch (err) {
      console.error(`[yahoo] normalization error for ${symbol}:`, err);
      return null;
    }
  }
}
