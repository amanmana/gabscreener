/**
 * Yahoo Finance Market Data Provider
 */

import yahooFinance from 'yahoo-finance2';
import { MarketDataProvider, NormalizedMarketData, DataSource, CalculationMode } from './types';

// Simple in-memory cache to prevent redundant fetches during a single request or briefly across requests
const CACHE_TTL_MS = 30000; // 30 seconds
const cache = new Map<string, { data: NormalizedMarketData; timestamp: number }>();

export class YahooProvider implements MarketDataProvider {
  name: DataSource = "yahoo";

  async fetchQuote(ticker: string): Promise<NormalizedMarketData> {
    // 1. Check cache
    const cached = cache.get(ticker);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      // 2. Fetch from Yahoo Finance
      const result = (await yahooFinance.quote(ticker)) as any;

      if (!result || !result.symbol) {
        throw new Error(`No data returned for ${ticker}`);
      }

      // 3. Logic for Gap Calculation
      const prevClose = result.regularMarketPreviousClose ?? null;
      const prePrice = result.preMarketPrice ?? null;
      const openPrice = result.regularMarketOpen ?? null;
      const currentPrice = result.regularMarketPrice ?? null;

      let gapPct: number | null = null;
      let calcMode: CalculationMode = "unavailable";

      if (prevClose && prevClose > 0) {
        if (prePrice && prePrice > 0) {
          // Primary formula: Premarket-based gap
          gapPct = ((prePrice - prevClose) / prevClose) * 100;
          calcMode = "premarket";
        } else if (openPrice && openPrice > 0) {
          // Fallback: Open-based gap
          gapPct = ((openPrice - prevClose) / prevClose) * 100;
          calcMode = "open-based";
        }
      }

      // 4. Normalize data
      const normalized: NormalizedMarketData = {
        symbol: result.symbol,
        previousClose: prevClose,
        todayOpen: openPrice,
        premarketPrice: prePrice,
        premarketVolume: result.preMarketVolume ?? null,
        currentPrice: currentPrice,
        high: result.regularMarketDayHigh ?? null,
        low: result.regularMarketDayLow ?? null,
        volume: result.regularMarketVolume ?? null,
        
        gapPct,
        rvol: null, 
        
        dataSource: this.name,
        dataTimestamp: new Date(),
        calculationMode: calcMode,
        isStale: false
      };

      // 5. Update cache and return
      cache.set(ticker, { data: normalized, timestamp: Date.now() });
      return normalized;
      
    } catch (error) {
       console.error(`[YahooProvider] Error fetching ${ticker}:`, error);
       throw error;
    }
  }

  async fetchQuotes(tickers: string[]): Promise<NormalizedMarketData[]> {
    // yahoo-finance2.quote can handle an array of tickers
    // but results are often incomplete if one fails, so we map individually or use quoteCombine (not available in v2)
    // Actually, calling .quote or better .quoteSummary for multiple or just Promise.all
    return Promise.all(tickers.map(t => this.fetchQuote(t).catch(err => {
        // Return a dummy/empty shell for failed tickers so the rest don't crash
        return {
            symbol: t,
            previousClose: null,
            todayOpen: null,
            premarketPrice: null,
            premarketVolume: null,
            currentPrice: null,
            high: null,
            low: null,
            volume: null,
            gapPct: null,
            rvol: null,
            dataSource: this.name,
            dataTimestamp: new Date(),
            calculationMode: "unavailable" as CalculationMode,
            isStale: true
        } as NormalizedMarketData;
    })));
  }
}

export const yahooProvider = new YahooProvider();
