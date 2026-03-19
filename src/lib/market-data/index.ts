/**
 * Market Data Providers
 */

import { YahooProvider } from "./yahoo";
import { StooqProvider } from "./stooq";
import { MarketDataProvider, NormalizedMarketData } from "./types";

const yahoo = new YahooProvider();
const stooq = new StooqProvider();

/**
 * Resilient Mult-Provider Implementation
 * Tries Yahoo first, falls back to Stooq if Yahoo is blocked/fails.
 */
class FallbackProvider implements MarketDataProvider {
  name: any = "composite";

  async fetchQuote(ticker: string): Promise<NormalizedMarketData> {
    try {
      console.log(`[MarketData] Attempting Yahoo for ${ticker}...`);
      const res = await yahoo.fetchQuote(ticker);
      
      // If Yahoo returns "unavailable", treat it as a failure and fallback
      if (res.calculationMode === "unavailable" && !res.previousClose) {
        throw new Error("Yahoo returned unavailable data");
      }
      return res;
    } catch (err) {
      console.warn(`[MarketData] Yahoo FAILED for ${ticker}, falling back to Stooq:`, (err as any).message);
      return await stooq.fetchQuote(ticker);
    }
  }

  async fetchQuotes(tickers: string[]): Promise<NormalizedMarketData[]> {
    try {
      const results = await yahoo.fetchQuotes(tickers);
      
      // Check if majority of results are unavailable
      const failures = results.filter(r => r.calculationMode === "unavailable" && !r.previousClose).length;
      if (failures > tickers.length / 2) {
        console.warn(`[MarketData] Multiple Yahoo failures (${failures}/${tickers.length}), switching batch to Stooq.`);
        return await stooq.fetchQuotes(tickers);
      }
      return results;
    } catch (err) {
      console.warn(`[MarketData] Batch Yahoo fetch failed, falling back to Stooq.`);
      return await stooq.fetchQuotes(tickers);
    }
  }
}

export const marketData = new FallbackProvider();
export { YahooProvider, StooqProvider };
