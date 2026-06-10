// app/api/admin/assign-matches/route.ts
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/firebase/admin";
import { db } from "@/lib/firebase/admin";
import { ApiFixtureResponse } from "@/types/api-football";
import { mapFixtureToMatch, mapApiStatus } from "@/lib/api-football/mappers";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  let adminUid: string;
  try {
    const decoded = await verifyAdminSession(req);
    adminUid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tournamentId: existingTournamentId, name, description, leagueIds, fixtures } = await req.json() as {
    tournamentId?: string;
    name?: string;
    description?: string;
    leagueIds: number[];
    fixtures: ApiFixtureResponse[];
  };

  if (!existingTournamentId && (!name || !fixtures || fixtures.length === 0)) {
    return NextResponse.json({ error: "name and fixtures required" }, { status: 400 });
  }
  if (existingTournamentId && (!fixtures || fixtures.length === 0)) {
    return NextResponse.json({ error: "fixtures required" }, { status: 400 });
  }

  try {
    let tournamentId = existingTournamentId || "";
    let tournamentRef;
    let mergedMatchIds: string[] = [];
    let mergedLeagueIds: number[] = [];
    let startDate: Date;
    let endDate: Date;
    let isEditing = false;

    const newMatchIds = fixtures.map((f) => String(f.fixture.id));
    const newKickoffDates = fixtures.map((f) => new Date(f.fixture.date).getTime());

    if (existingTournamentId) {
      tournamentRef = db.collection("tournaments").doc(existingTournamentId);
      const tSnap = await tournamentRef.get();
      if (!tSnap.exists) {
        return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
      }
      isEditing = true;
      const tData = tSnap.data() || {};
      
      mergedMatchIds = Array.from(new Set([...(tData.matchIds || []), ...newMatchIds]));
      mergedLeagueIds = Array.from(new Set([...(tData.leagueIds || []), ...leagueIds]));
      
      const currentStartDate = tData.startDate?.toDate() || new Date();
      const currentEndDate = tData.endDate?.toDate() || new Date();
      if (newKickoffDates.length > 0) {
        const minNew = new Date(Math.min(...newKickoffDates));
        const maxNew = new Date(Math.max(...newKickoffDates));
        startDate = minNew < currentStartDate ? minNew : currentStartDate;
        endDate = maxNew > currentEndDate ? maxNew : currentEndDate;
      } else {
        startDate = currentStartDate;
        endDate = currentEndDate;
      }
    } else {
      tournamentRef = db.collection("tournaments").doc();
      tournamentId = tournamentRef.id;
      mergedMatchIds = newMatchIds;
      mergedLeagueIds = leagueIds;
      startDate = new Date(Math.min(...newKickoffDates));
      endDate = new Date(Math.max(...newKickoffDates));
    }

    const batch = db.batch();

    if (isEditing) {
      batch.update(tournamentRef, {
        matchIds: mergedMatchIds,
        leagueIds: mergedLeagueIds,
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
      });
    } else {
      batch.set(tournamentRef, {
        id: tournamentId,
        name: name || "",
        description: description ?? "",
        status: "open",
        matchIds: mergedMatchIds,
        leagueIds: mergedLeagueIds,
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
    }

    // Write each match document
    for (const fixture of fixtures) {
      const matchDoc = mapFixtureToMatch(fixture, tournamentId);
      const matchRef = db.collection("matches").doc(matchDoc.id);
      
      // Omit tournamentIds from mapper and use FieldValue.arrayUnion
      const { tournamentIds: _, ...rest } = matchDoc as any;
      batch.set(
        matchRef,
        {
          ...rest,
          tournamentIds: FieldValue.arrayUnion(tournamentId),
        },
        { merge: true }
      );
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
