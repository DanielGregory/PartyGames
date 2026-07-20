import { NextRequest, NextResponse } from "next/server";
import { joinRoom } from "@/server/room";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/roomCode";

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = normalizeRoomCode(rawCode);
  if (!isValidRoomCode(code)) {
    return NextResponse.json({ error: "Invalid room code." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const playerId = body?.playerId;
  const name = body?.name;
  if (typeof playerId !== "string" || !playerId) {
    return NextResponse.json({ error: "Missing playerId." }, { status: 400 });
  }

  const { privateToken } = await joinRoom(code, playerId, typeof name === "string" ? name : "");
  return NextResponse.json({ privateToken });
}
