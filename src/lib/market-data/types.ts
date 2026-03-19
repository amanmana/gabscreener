/**
 * Market Data Adapter Types
 * Designed to support multiple providers (Yahoo Finance, IEX, Alpaca, etc.)
 */

export type DataSource = "yahoo" | "iex" | "alpaca" | "stooq" | "mock";
export type CalculationMode = "premarket" | "open-based" | "unavailable";

export interface NormalizedMarketData {
  symbol: string;
  previousClose: number | null;
  todayOpen: number | null;
  premarketPrice: number | null;
  premarketVolume: number | null;
  currentPrice: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  
  // Scoring inputs
  gapPct: number | null;
  rvol: number | null; // Placeholder for logic
  
  // Metadata
  dataSource: DataSource;
  dataTimestamp: Date;
  calculationMode: CalculationMode;
  isStale: boolean;
}

export interface MarketDataProvider {
  name: DataSource;
  fetchQuote(ticker: string): Promise<NormalizedMarketData | null>;
  fetchQuotes(tickers: string[]): Promise<NormalizedMarketData[]>;
}
