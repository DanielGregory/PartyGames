import { NextRequest, NextResponse } from "next/server";
import { heartbeat } from "@/server/room";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/roomCode";

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = normalizeRoomCode(rawCode);
  if (!isValidRoomCode(code)) {
    return NextResponse.json({ error: "Invalid room code." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const playerId = body?.playerId;
  if (typeof playerId !== "string" || !playerId) {
    return NextResponse.json({ error: "Missing playerId." }, { status: 400 });
  }

  await heartbeat(code, playerId);
  return NextResponse.json({ ok: true });
}
