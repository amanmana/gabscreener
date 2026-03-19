/**
 * Stooq.com Market Data Provider (Resilient Fallback)
 */

import { 
  MarketDataProvider, 
  NormalizedMarketData, 
  DataSource,
  CalculationMode 
} from "./types";

const STOOQ_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
};

export class StooqProvider implements MarketDataProvider {
  name: DataSource = "stooq";

  /**
   * Stooq JSON Quote API
   */
  async fetchQuote(ticker: string): Promise<NormalizedMarketData> {
    // Stooq US tickers use .US suffix
    const stooqTicker = ticker.includes(".") ? ticker : `${ticker}.US`;
    const url = `https://stooq.com/q/l/?s=${stooqTicker}&f=sd2t2ohlcpv&e=json`;

    try {
      const res = await fetch(url, { headers: STOOQ_HEADERS });
      if (!res.ok) throw new Error(`Stooq HTTP Error: ${res.status}`);
      
      const body = await res.json();
      const s = body?.symbols?.[0];
      if (!s || !s.symbol) throw new Error(`No Stooq data for ${ticker}`);

      // Stooq doesn't provide premarket, so we label as "open-based" or "unavailable" 
      // but we get the critical "previous" close.
      const prevClose = s.previous ?? null;
      const currentPrice = s.close ?? null;
      const openPrice = s.open ?? null;
      const volume = s.volume ?? null;

      let gapPct: number | null = null;
      let calcMode: CalculationMode = "unavailable";

      if (prevClose && prevClose > 0 && openPrice && openPrice > 0) {
        gapPct = ((openPrice - prevClose) / prevClose) * 100;
        calcMode = "open-based";
      }

      return {
        symbol: ticker,
        previousClose: prevClose,
        currentPrice: currentPrice,
        premarketPrice: null,
        todayOpen: openPrice,
        volume: volume,
        premarketVolume: null,
        gapPct,
        rvol: null,
        high: s.high ?? null,
        low: s.low ?? null,
        dataSource: "stooq", 
        dataTimestamp: new Date(),
        calculationMode: calcMode,
        isStale: false,
      };
    } catch (err: any) {
      console.error(`[StooqProvider] Error for ${ticker}:`, err.message);
      throw err;
    }
  }

  async fetchQuotes(tickers: string[]): Promise<NormalizedMarketData[]> {
     return Promise.all(tickers.map(t => this.fetchQuote(t).catch(() => ({
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
        dataSource: "stooq",
        dataTimestamp: new Date(),
        calculationMode: "unavailable",
        isStale: true
     } as NormalizedMarketData))));
  }
}
