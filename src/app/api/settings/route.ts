/**
 * GET   /api/settings  - get user settings (singleton row id=1)
 * PATCH /api/settings  - update user settings
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "edge";

export async function GET() {
  try {
    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.id, 1),
    }).catch(err => {
      console.warn("[settings GET] DB Error, using defaults:", err);
      return null;
    });

    return NextResponse.json(
      settings ?? {
        id: 1,
        accountSize: 10000,
        maxRiskPct: 1,
        shariahSource: "manual",
        minGapPct: 4,
        minPremarketVol: 300000,
        showGradeC: false,
      }
    );
  } catch (err) {
    console.error("[settings GET] Critical error:", err);
    return NextResponse.json({ error: "Critical error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();

    // Whitelist allowed fields
    const allowed: Record<string, unknown> = {};
    if (typeof body.accountSize === "number") allowed.accountSize = body.accountSize;
    if (typeof body.maxRiskPct === "number") allowed.maxRiskPct = body.maxRiskPct;
    if (typeof body.shariahSource === "string") allowed.shariahSource = body.shariahSource;
    if (typeof body.minGapPct === "number") allowed.minGapPct = body.minGapPct;
    if (typeof body.minPremarketVol === "number") allowed.minPremarketVol = body.minPremarketVol;
    if (typeof body.showGradeC === "boolean") allowed.showGradeC = body.showGradeC;
    allowed.updatedAt = new Date();

    // Upsert: if no row exists yet, create; otherwise update
    type InsertSettings = typeof userSettings.$inferInsert;
    const insertValues: InsertSettings = {
      id: 1,
      accountSize: (allowed.accountSize as number) ?? 10000,
      maxRiskPct: (allowed.maxRiskPct as number) ?? 1,
      shariahSource: (allowed.shariahSource as string) ?? "manual",
      minGapPct: (allowed.minGapPct as number) ?? 4,
      minPremarketVol: (allowed.minPremarketVol as number) ?? 300000,
      showGradeC: (allowed.showGradeC as boolean) ?? false,
    };
    await db
      .insert(userSettings)
      .values(insertValues)
      .onConflictDoUpdate({ target: userSettings.id, set: allowed });

    const updated = await db.query.userSettings.findFirst({
      where: eq(userSettings.id, 1),
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[settings PATCH]", err);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
