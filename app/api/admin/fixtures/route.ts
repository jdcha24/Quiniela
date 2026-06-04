// app/api/admin/fixtures/route.ts
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { fetchFixtures } from "@/lib/api-football/client";
import { verifyAdminSession } from "@/lib/firebase/admin";
import { getFallbackFixtures } from "@/lib/api-football/fallbacks";

export async function GET(req: NextRequest) {
  try {
    await verifyAdminSession(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const league = searchParams.get("league");
  const season = searchParams.get("season") ?? String(new Date().getFullYear());
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const status = searchParams.get("status") ?? "NS";

  if (!league) {
    return NextResponse.json({ error: "league param required" }, { status: 400 });
  }

  try {
    const data = await fetchFixtures({
      league: Number(league),
      season: Number(season),
      from,
      to,
      status: status && status !== "ALL" ? status : undefined,
    });
    const responseArray = (data as { response: unknown[] }).response || [];
    if (responseArray.length === 0) {
      console.warn(`[API/admin/fixtures] Empty response for league ${league}, serving fallback fixtures.`);
      return NextResponse.json(getFallbackFixtures(Number(league)), { headers: { "X-API-Fallback": "true" } });
    }
    return NextResponse.json(responseArray);
  } catch (err) {
    console.error("[API/admin/fixtures] Error fetching fixtures, serving fallback fixtures:", err);
    return NextResponse.json(getFallbackFixtures(Number(league)), { headers: { "X-API-Fallback": "true" } });
  }
}
