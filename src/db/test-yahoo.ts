/**
 * Yahoo Finance Test Script
 * Use this to verify the market data provider is working.
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { fetchLiveMarketData } from "../lib/market-data";

async function main() {
  const ticker = "NVDA";
  console.log(`🔍 Testing Yahoo Finance for ${ticker}...`);

  try {
    const data = await marketData.fetchQuote(ticker);
    console.log("✅ Success! Normalized Data:");
    console.log(JSON.stringify(data, null, 2));
    
    if (!data.previousClose && !data.currentPrice) {
        console.warn("⚠️ Data returned, but all price fields are null. Check Yahoo's response keys.");
    }
    
  } catch (error) {
    console.error("❌ Yahoo Finance Fetch Failed:", error);
  }
}

main().catch(console.error);
