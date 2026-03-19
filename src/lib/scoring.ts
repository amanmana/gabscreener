/**
 * Shariah Gap Screener — Conservative Scoring Engine (v2)
 *
 * Computes a 100-point score for each gap-up candidate.
 * Conservative philosophy: prioritize structure and liquidity over gap size.
 *
 * Refined Weights:
 *   Structure Score:        max 30 (Critical)
 *   Premarket Volume Score: max 20 (Conviction)
 *   Relative Volume Score:  max 15 (Confirmation)
 *   Liquidity Score:        max 15 (Safety)
 *   Gap Score:              max 15 (Discovery)
 *   Catalyst Score:         max 5  (Bonus)
 *
 * Penalties: up to -80 (Aggressive Risk Rules)
 */

import { NormalizedMarketData } from "./market-data/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StructureParams {
  holdsAboveVwap: boolean; // +12
  nearPremarketHigh: boolean; // +10
  tightConsolidation: boolean; // +8
}

export interface LiquidityParams {
  tightSpread: boolean; // spread < 0.2% of price → +8
  strongDollarVolume: boolean; // dollar vol > threshold → +7
}

export interface PenaltyParams {
  spreadTooWide: boolean; // -15
  weakRejectionAfterOpen: boolean; // -10
  belowPremarketVwap: boolean; // -25
  extendedFromBase: boolean; // -20
  choppyStructure: boolean; // -10
  poorLiquidityAfterOpen: boolean; // -15
}

export interface ScoreBreakdown {
  gapScore: number;
  premarketVolScore: number;
  rvolScore: number;
  structureScore: number;
  liquidityScore: number;
  catalystScore: number;
  totalPenalty: number;
  finalScore: number;
  grade: "A" | "B" | "C" | "avoid";
  isTradeable: boolean;
}

// ─── Component Calculators ────────────────────────────────────────────────────

/**
 * Gap Score (max 15) — Discovery indicator
 * 3.0–4.99%  → 5
 * 5.0–8.99%  → 10
 * 9.0–28.0%  → 15
 * > 28.0%    → 15 (but triggers Exhaustion Penalty later)
 */
export function calcGapScore(gapPct: number): number {
  if (gapPct < 3) return 0;
  if (gapPct < 5) return 5;
  if (gapPct < 9) return 10;
  return 15;
}

/**
 * Premarket Volume Score (max 20) — Conviction indicator
 * 300k–499k  → 8
 * 500k–999k  → 14
 * 1M+        → 20
 */
export function calcPremarketVolScore(vol: number): number {
  if (vol < 300_000) return 0;
  if (vol < 500_000) return 8;
  if (vol < 1_000_000) return 14;
  return 20;
}

/**
 * Relative Volume Score (max 15) — Confirmation indicator
 * 1.5–1.99 → 6
 * 2.0–2.99 → 10
 * 3.0+     → 15
 */
export function calcRvolScore(rvol: number): number {
  if (rvol < 1.5) return 0;
  if (rvol < 2.0) return 6;
  if (rvol < 3.0) return 10;
  return 15;
}

/**
 * Structure Score (max 30) — Technical Quality
 * Importance: High (30% of total)
 */
export function calcStructureScore(params: StructureParams): number {
  let score = 0;
  if (params.holdsAboveVwap) score += 12;
  if (params.nearPremarketHigh) score += 10;
  if (params.tightConsolidation) score += 8;
  return score;
}

/**
 * Liquidity Score (max 15) — Safety indicator
 */
export function calcLiquidityScore(params: LiquidityParams): number {
  let score = 0;
  if (params.tightSpread) score += 8;
  if (params.strongDollarVolume) score += 7;
  return score;
}

/**
 * Catalyst Score (max 5) — Bonus confirmation
 */
export function calcCatalystScore(hasCatalyst: boolean): number {
  return hasCatalyst ? 5 : 0;
}

/**
 * Penalty Calculator — Aggressive conservative filters
 */
export function calcPenalties(params: PenaltyParams, gapPct: number): number {
  let penalty = 0;
  if (params.spreadTooWide) penalty -= 15;
  if (params.weakRejectionAfterOpen) penalty -= 10;
  if (params.belowPremarketVwap) penalty -= 25;
  if (params.extendedFromBase) penalty -= 20;
  if (params.choppyStructure) penalty -= 10;
  if (params.poorLiquidityAfterOpen) penalty -= 15;
  
  // Exhaustion Rule: Caps over 28% are often blow-off tops
  if (gapPct > 28) penalty -= 20;

  return penalty;
}

// ─── Final Score & Grade ──────────────────────────────────────────────────────

/**
 * Compute final score with Gating Rules
 */
export function calcFinalScore(
  gapScore: number,
  premarketVolScore: number,
  rvolScore: number,
  structureScore: number,
  liquidityScore: number,
  catalystScore: number,
  penalty: number,
  gapPct: number
): number {
  // Gating Rule 1: Floor
  if (gapPct < 3.0) return 0;

  let raw = gapScore + premarketVolScore + rvolScore + structureScore + liquidityScore + catalystScore + penalty;
  raw = Math.max(0, Math.min(100, raw));

  // Gating Rule 2: Structure Gate
  // If structure is weak (<50% of possible points), cap score to B-grade level
  if (structureScore < 15 && raw > 69) {
    raw = 69;
  }

  // Gating Rule 3: Volume Gate
  // If premarket conviction is low (<50% of points), cap score to B-grade level
  if (premarketVolScore < 10 && raw > 69) {
    raw = 69;
  }

  return raw;
}

/**
 * Stricter Grades (v2)
 * 85–100 → A  (Elite setups only)
 * 70–84  → B  (Strong setups)
 * 55–69  → C  (Marginal/Noise)
 * < 55   → avoid
 */
export function getGrade(finalScore: number): "A" | "B" | "C" | "avoid" {
  if (finalScore >= 85) return "A";
  if (finalScore >= 70) return "B";
  if (finalScore >= 55) return "C";
  return "avoid";
}

/**
 * Grade override for data quality
 */
export function overrideGradeByDataQuality(
  originalGrade: "A" | "B" | "C" | "avoid",
  calcMode: string | null
): "A" | "B" | "C" | "avoid" {
  // If premarket data was missing (open-based fallback), do not allow A/B grades
  if (calcMode !== "premarket" && (originalGrade === "A" || originalGrade === "B")) {
    return "C";
  }
  return originalGrade;
}

/**
 * Actionable Entry Status (v2)
 */
export function getEntryStatus(
  grade: "A" | "B" | "C" | "avoid",
  params: {
    penalties: PenaltyParams;
    structure: StructureParams;
    finalScore: number;
  }
): "Watch" | "Near Trigger" | "Breakout Triggered" | "Avoid" {
  if (
    grade === "avoid" ||
    params.penalties.spreadTooWide ||
    params.penalties.belowPremarketVwap ||
    params.finalScore < 55
  ) {
    return "Avoid";
  }

  if (
    params.structure.nearPremarketHigh &&
    params.structure.holdsAboveVwap &&
    params.structure.tightConsolidation &&
    params.finalScore >= 80
  ) {
    return "Breakout Triggered";
  }

  if (
    (params.structure.nearPremarketHigh || params.structure.holdsAboveVwap) &&
    params.finalScore >= 70
  ) {
    return "Near Trigger";
  }

  return "Watch";
}

/**
 * Tradeability Check (v2)
 */
export function checkTradeability(
  grade: "A" | "B" | "C" | "avoid",
  penalties: PenaltyParams,
  finalScore: number
): boolean {
  if (grade === "avoid") return false;
  if (penalties.spreadTooWide) return false;
  if (penalties.belowPremarketVwap) return false;
  if (penalties.extendedFromBase) return false; // Hard fail on chasing in v2
  if (finalScore < 60) return false; // Stricter threshold
  return true;
}

// ─── All-in-One Calculator ────────────────────────────────────────────────────

export interface FullScoreInput {
  gapPct: number;
  premarketVol: number;
  rvol: number;
  currentPrice?: number;
  structure: StructureParams;
  liquidity: LiquidityParams;
  hasCatalyst: boolean;
  penalties: PenaltyParams;
}

/**
 * Data Validation (Production Safety)
 */
export function validateMarketData(data: NormalizedMarketData): boolean {
  if (!data.symbol) return false;
  if (!data.previousClose || data.previousClose <= 0) return false;
  if (data.calculationMode === "unavailable") return false;
  if (data.isStale) return false;
  if (data.gapPct === null) return false;
  return true;
}

export function computeFullScore(input: FullScoreInput): ScoreBreakdown {
  const gapScore = calcGapScore(input.gapPct);
  const premarketVolScore = calcPremarketVolScore(input.premarketVol);
  const rvolScore = calcRvolScore(input.rvol);
  const structureScore = calcStructureScore(input.structure);
  const liquidityScore = calcLiquidityScore(input.liquidity);
  const catalystScore = calcCatalystScore(input.hasCatalyst);
  const totalPenalty = calcPenalties(input.penalties, input.gapPct);

  const finalScore = calcFinalScore(
    gapScore,
    premarketVolScore,
    rvolScore,
    structureScore,
    liquidityScore,
    catalystScore,
    totalPenalty,
    input.gapPct
  );

  const rawGrade = getGrade(finalScore);
  const isTradeable = checkTradeability(rawGrade, input.penalties, finalScore);

  return {
    gapScore,
    premarketVolScore,
    rvolScore,
    structureScore,
    liquidityScore,
    catalystScore,
    totalPenalty,
    finalScore,
    grade: rawGrade,
    isTradeable,
  };
}

/**
 * Wrapper to score directly from normalized market data
 */
export function scoreFromMarketData(
  data: NormalizedMarketData, 
  extra: { 
    rvol: number;
    structure: StructureParams;
    hasCatalyst: boolean;
    penalties: PenaltyParams;
  }
): ScoreBreakdown | null {
  if (!validateMarketData(data)) return null;

  return computeFullScore({
    gapPct: data.gapPct!,
    premarketVol: data.premarketVolume ?? 0,
    rvol: extra.rvol,
    structure: extra.structure,
    liquidity: {
      tightSpread: (data.currentPrice ?? 0) > 0 ? (0.3 / 100) > ((data.currentPrice ?? 0) * 0.003) : false, // simplified logic here, actual spreadPct check is better
      strongDollarVolume: ((data.currentPrice ?? 0) * (data.premarketVolume ?? 0)) > 50_000_000,
    },
    hasCatalyst: extra.hasCatalyst,
    penalties: extra.penalties,
  });
}
