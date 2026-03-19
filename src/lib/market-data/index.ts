/**
 * Market Data Orchestrator
 * Routes requests to Yahoo (via Proxy) or Stooq (Fallback)
 */

import { YahooProvider } from "./yahoo";
import { StooqProvider } from "./stooq";
import { NormalizedMarketData } from "./types";

export interface MarketDataSummary {
  results: NormalizedMarketData[];
  source: string;
}

export async function fetchLiveMarketData(tickers: string[]): Promise<MarketDataSummary> {
  const yahoo = new YahooProvider();
  const stooq = new StooqProvider();

  // 1. Try Yahoo (High Fidelity)
  try {
    const yahooResults = await yahoo.fetchQuotes(tickers);
    if (yahooResults.length > 0) {
      return { results: yahooResults, source: "yahoo" };
    }
  } catch (err) {
    console.warn("[market-data] Yahoo failed, falling back to Stooq:", err);
  }

  // 2. Fallback to Stooq (Always available)
  const stooqResults = await stooq.fetchQuotes(tickers);
  return { results: stooqResults, source: "stooq" };
}

/**
 * Compatibility alias for older scripts
 */
export const marketData = async (tickers: string[]) => {
  const { results } = await fetchLiveMarketData(tickers);
  return results;
};

/**
 * Single ticker fetch with safety checks
 */
export async function fetchSingleTicker(ticker: string): Promise<NormalizedMarketData | null> {
  const yahoo = new YahooProvider();
  const res = await yahoo.fetchQuote(ticker);
  
  if (!res) return null;
  
  // If Yahoo returns "unavailable", treat it as a failure
  if (res.calculationMode === "unavailable" && !res.previousClose) {
    return null;
  }
  
  return res;
}
