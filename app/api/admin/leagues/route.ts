// app/api/admin/leagues/route.ts
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { fetchLeagues } from "@/lib/api-football/client";
import { verifyAdminSession } from "@/lib/firebase/admin";
import { FALLBACK_LEAGUES } from "@/lib/api-football/fallbacks";

export async function GET(req: NextRequest) {
  try {
    await verifyAdminSession(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const season = searchParams.get("season") ?? String(new Date().getFullYear());
  const country = searchParams.get("country") ?? undefined;
  const type = searchParams.get("type") as "League" | "Cup" | undefined;

  try {
    const data = await fetchLeagues({ season: Number(season), country, type });
    const responseArray = (data as { response: unknown[] }).response || [];
    if (responseArray.length === 0) {
      console.warn("[API/admin/leagues] Empty response from API, serving fallback leagues.");
      return NextResponse.json(FALLBACK_LEAGUES, { headers: { "X-API-Fallback": "true" } });
    }
    return NextResponse.json(responseArray);
  } catch (err) {
    console.error("[API/admin/leagues] Error fetching leagues, serving fallback leagues:", err);
    return NextResponse.json(FALLBACK_LEAGUES, { headers: { "X-API-Fallback": "true" } });
  }
}
