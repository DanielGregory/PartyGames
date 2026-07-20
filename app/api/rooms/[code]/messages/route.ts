import { NextRequest, NextResponse } from "next/server";
import { RoomActionError, handleMessage } from "@/server/room";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/roomCode";
import type { ClientMessage } from "@/server/types";

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = normalizeRoomCode(rawCode);
  if (!isValidRoomCode(code)) {
    return NextResponse.json({ error: "Invalid room code." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const playerId = body?.playerId;
  const message = body?.message as ClientMessage | undefined;
  if (typeof playerId !== "string" || !playerId || !message?.type) {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  try {
    await handleMessage(code, playerId, message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof RoomActionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
