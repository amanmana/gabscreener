/**
 * Yahoo Finance Provider — High Fidelity Market Data
 * Fixed Version (Vercel Build Safe)
 */

import { NormalizedMarketData, MarketDataProvider, DataSource } from "./types";

export class YahooProvider implements MarketDataProvider {
  readonly name: DataSource = "yahoo";

  private getProxyUrl(ticker: string, endpoint: 'quote' | 'chart' | 'v7' = 'quote'): string | null {
    const proxyBase = process.env.YAHOO_PROXY_URL || process.env.NEXT_PUBLIC_YAHOO_PROXY_URL;
    if (!proxyBase) return null;
    
    const base = proxyBase.replace(/\/$/, "");
    return `${base}?ticker=${ticker}&endpoint=${endpoint}`;
  }

  async fetchQuote(ticker: string): Promise<NormalizedMarketData | null> {
    const proxyUrl = this.getProxyUrl(ticker, 'chart');
    
    if (proxyUrl) {
      try {
        const res = await fetch(proxyUrl, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          return this.normalizeChartData(ticker, data);
        }
      } catch (err) {
        console.error(`[yahoo proxy] ${ticker}:`, err);
      }
    }

    try {
      const directUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m&range=1d`;
      const res = await fetch(directUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        cache: 'no-store'
      });

      if (res.ok) {
        const data = await res.json();
        return this.normalizeChartData(ticker, data);
      }
    } catch (err) {
      console.error(`[yahoo direct] ${ticker}:`, err);
    }
    
    return null;
  }

  async fetchQuotes(tickers: string[]): Promise<NormalizedMarketData[]> {
    const results = await Promise.all(tickers.map(t => this.fetchQuote(t)));
    return results.filter((r): r is NormalizedMarketData => r !== null);
  }

  private normalizeChartData(symbol: string, raw: any): NormalizedMarketData | null {
    try {
      if (!raw?.chart?.result?.[0]) return null;
      const result = raw.chart.result[0];
      const meta = result.meta;
      const quote = result.indicators?.quote?.[0];

      if (!meta) return null;

      const prevClose = meta.previousClose;
      const currentPrice = meta.regularMarketPrice;
      const open = meta.regularMarketOpen || (quote?.open ? quote.open[0] : currentPrice);
      
      // Safe H/L calculation (Vercel Build Safe)
      const highs: number[] = quote?.high ? quote.high.filter((v: any) => typeof v === 'number') : [];
      const lows: number[] = quote?.low ? quote.low.filter((v: any) => typeof v === 'number') : [];
      
      const sessionHigh = highs.length > 0 ? Math.max(...highs) : currentPrice;
      const sessionLow = lows.length > 0 ? Math.min(...lows) : currentPrice;

      const vols: number[] = quote?.volume ? quote.volume.filter((v: any) => typeof v === 'number') : [];
      const sessionVolume = vols.length > 0 ? vols.reduce((a, b) => a + b, 0) : null;

      let gapPct = 0;
      if (prevClose && currentPrice) {
        gapPct = ((currentPrice - prevClose) / prevClose) * 100;
      }

      return {
        symbol,
        currentPrice,
        previousClose: prevClose,
        todayOpen: open || currentPrice,
        premarketPrice: currentPrice,
        high: sessionHigh,
        low: sessionLow,
        premarketVolume: sessionVolume,
        volume: sessionVolume,
        rvol: null,
        gapPct,
        dataTimestamp: new Date(meta.regularMarketTime * 1000),
        dataSource: "yahoo",
        calculationMode: "premarket",
        isStale: false
      };
    } catch (err) {
      console.error(`[yahoo norm] ${symbol}:`, err);
      return null;
    }
  }
}
