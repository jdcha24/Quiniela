// app/api/admin/assign-matches/route.ts
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/firebase/admin";
import { db } from "@/lib/firebase/admin";
import { ApiFixtureResponse } from "@/types/api-football";
import { mapFixtureToMatch, mapApiStatus } from "@/lib/api-football/mappers";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  let adminUid: string;
  try {
    const decoded = await verifyAdminSession(req);
    adminUid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, description, leagueIds, fixtures } = await req.json() as {
    name: string;
    description?: string;
    leagueIds: number[];
    fixtures: ApiFixtureResponse[];
  };

  if (!name || !fixtures || fixtures.length === 0) {
    return NextResponse.json({ error: "name and fixtures required" }, { status: 400 });
  }

  try {
    // Create tournament document
    const tournamentRef = db.collection("tournaments").doc();
    const tournamentId = tournamentRef.id;

    const kickoffDates = fixtures.map((f) => new Date(f.fixture.date).getTime());
    const startDate = new Date(Math.min(...kickoffDates));
    const endDate = new Date(Math.max(...kickoffDates));

    const batch = db.batch();

    // Write tournament
    batch.set(tournamentRef, {
      id: tournamentId,
      name,
      description: description ?? "",
      status: "open",
      matchIds: fixtures.map((f) => String(f.fixture.id)),
      leagueIds,
      season: new Date().getFullYear(),
      allowLateJoin: true,
      createdBy: adminUid,
      createdAt: Timestamp.now(),
      startDate: Timestamp.fromDate(startDate),
      endDate: Timestamp.fromDate(endDate),
      participantCount: 0,
      scoringRules: {
        exactScore: 3,
        correctResult: 1,
        wrong: 0,
      },
    });

    // Write each match document
    for (const fixture of fixtures) {
      const matchDoc = mapFixtureToMatch(fixture, tournamentId);
      const matchRef = db.collection("matches").doc(matchDoc.id);
      batch.set(matchRef, matchDoc, { merge: true });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      tournamentId,
      matchesAdded: fixtures.length,
    });
  } catch (err) {
    console.error("[API/admin/assign-matches]", err);
    return NextResponse.json({ error: "Failed to create tournament" }, { status: 500 });
  }
}
