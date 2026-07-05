// app/api/rankings/route.ts
import { NextResponse } from "next/server";
import { readRankings } from "@/lib/rankings-store";

/** GET /api/rankings — renvoie le classement complet, trié par rang. */
export async function GET() {
  const data = await readRankings();
  return NextResponse.json(data);
}