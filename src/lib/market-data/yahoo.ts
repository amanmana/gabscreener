/**
 * Yahoo Finance Market Data Provider
 */

import yahooFinance from "yahoo-finance2";
import { 
  MarketDataProvider, 
  NormalizedMarketData, 
  CalculationMode,
  DataSource
} from "./types";

/**
 * Standard Browser Headers to minimize rate limits / bot detection
 */
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Cache-Control": "max-age=0",
  "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"macOS"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1"
};

// Simple singleton cache (30s lifetime)
const cache = new Map<string, { data: NormalizedMarketData, timestamp: number }>();
const CACHE_TTL = 30 * 1000;

export class YahooProvider implements MarketDataProvider {
  name: DataSource = "yahoo";

  /**
   * Internal helper using native fetch with browser headers
   */
  private async fetchManual(ticker: string, version: "v7" | "v6" = "v7"): Promise<any> {
    const url = `https://query1.finance.yahoo.com/${version}/finance/quote?symbols=${ticker}`;
    const res = await fetch(url, { headers: HEADERS });
    
    if (res.status === 429) throw new Error("Yahoo Rate Limit (429)");
    if (!res.ok) throw new Error(`Yahoo HTTP Error: ${res.status}`);
    
    const body = await res.json();
    const result = body?.quoteResponse?.result?.[0];
    if (!result) throw new Error("No ticker result in Yahoo response");
    return result;
  }

  async fetchQuote(ticker: string): Promise<NormalizedMarketData> {
    // 1. Check cache
    const cached = cache.get(ticker);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return cached.data;
    }

    try {
      // 2. Try manual fetch with browser headers (v7)
      let result: any;
      try {
        result = await this.fetchManual(ticker, "v7");
      } catch (err: any) {
        console.warn(`[YahooProvider] Manual v7 failed for ${ticker}, trying v6 fallback: ${err.message}`);
        // Fallback to legacy v6 if v7 fails
        result = await this.fetchManual(ticker, "v6");
      }

      const prevClose = result.regularMarketPreviousClose ?? result.prevClose ?? null;
      const currentPrice = result.regularMarketPrice ?? result.price ?? null;
      const prePrice = result.preMarketPrice ?? null;
      const openPrice = result.regularMarketOpen ?? null;
      const volume = result.regularMarketVolume ?? null;
      const preVolume = result.preMarketVolume ?? null;

      let gapPct: number | null = null;
      let calcMode: CalculationMode = "unavailable";

      if (prevClose && prevClose > 0) {
        if (prePrice && prePrice > 0) {
          gapPct = ((prePrice - prevClose) / prevClose) * 100;
          calcMode = "premarket";
        } else if (openPrice && openPrice > 0) {
          gapPct = ((openPrice - prevClose) / prevClose) * 100;
          calcMode = "open-based";
        }
      }

      const normalized: NormalizedMarketData = {
        symbol: ticker,
        previousClose: prevClose,
        currentPrice: currentPrice,
        premarketPrice: prePrice,
        todayOpen: openPrice,
        volume: volume,
        premarketVolume: preVolume,
        gapPct,
        rvol: null,
        high: result.regularMarketDayHigh ?? null,
        low: result.regularMarketDayLow ?? null,
        
        dataSource: "yahoo",
        dataTimestamp: new Date(),
        calculationMode: calcMode,
        isStale: false,
      };

      cache.set(ticker, { data: normalized, timestamp: Date.now() });
      return normalized;
      
    } catch (error: any) {
       console.error(`[YahooProvider] ERROR for ${ticker}:`, error.message);
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
