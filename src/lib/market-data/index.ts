/**
 * Market Data Entry Point
 * Used to centralize which provider the application uses
 */

import { yahooProvider } from './yahoo';
import { MarketDataProvider } from './types';

// Exported singleton for app-wide use
export const marketData: MarketDataProvider = yahooProvider;

export * from './types';
export * from './yahoo';
