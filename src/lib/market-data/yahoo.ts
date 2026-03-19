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
   * Internal helper using v8 chart endpoint (often less restricted than quote)
   */
  private async fetchFromChart(ticker: string): Promise<any> {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m&range=1d&includePrePost=true`;
    console.log(`[YahooProvider] Attempting Chart Fetch for ${ticker}...`);
    
    const res = await fetch(url, { headers: HEADERS });
    if (res.status === 429) throw new Error("Yahoo Rate Limit (429)");
    if (!res.ok) throw new Error(`Yahoo Chart Error: ${res.status}`);
    
    const body = await res.json();
    const result = body?.chart?.result?.[0];
    if (!result) throw new Error("No chart result in Yahoo response");
    return result;
  }

  /**
   * Fallback helper using v7 quote endpoint
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
    const cached = cache.get(ticker);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return cached.data;
    }

    try {
      // 1. Try Chart first (Resilient)
      const chart = await this.fetchFromChart(ticker);
      const meta = chart.meta;

      const prevClose = meta.previousClose ?? null;
      const currentPrice = meta.regularMarketPrice ?? null;
      const prePrice = meta.preMarketPrice ?? null;
      const openPrice = meta.regularMarketOpen ?? null;
      const volume = meta.regularMarketVolume ?? null;

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
        premarketVolume: null,
        gapPct,
        rvol: null,
        high: null,
        low: null,
        dataSource: "yahoo",
        dataTimestamp: new Date(),
        calculationMode: calcMode,
        isStale: false,
      };

      cache.set(ticker, { data: normalized, timestamp: Date.now() });
      return normalized;
      
    } catch (error: any) {
       console.warn(`[YahooProvider] Chart failed for ${ticker}, trying Quote: ${error.message}`);
       try {
         // 2. Fallback to manual Quote v7
         const result = await this.fetchManual(ticker, "v7");
         
         const prevClose = result.regularMarketPreviousClose ?? result.prevClose ?? null;
         const currentPrice = result.regularMarketPrice ?? result.price ?? null;
         const prePrice = result.preMarketPrice ?? null;
         const openPrice = result.regularMarketOpen ?? null;

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
           volume: result.regularMarketVolume ?? null,
           premarketVolume: result.preMarketVolume ?? null,
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
       } catch (finalError: any) {
         console.error(`[YahooProvider] CRITICAL ERROR for ${ticker}:`, finalError.message);
         throw finalError;
       }
    }
  }

  async fetchQuotes(tickers: string[]): Promise<NormalizedMarketData[]> {
    return Promise.all(tickers.map(t => this.fetchQuote(t).catch(err => {
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
        dataSource: "yahoo",
        dataTimestamp: new Date(),
        calculationMode: "unavailable",
        isStale: true
      } as NormalizedMarketData;
    })));
  }
}
