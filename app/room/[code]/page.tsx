import { RoomClient } from "@/components/RoomClient";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/roomCode";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const normalized = normalizeRoomCode(code);

  if (!isValidRoomCode(normalized)) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-lg text-muted">
          &ldquo;{code}&rdquo; isn&apos;t a valid room code. Codes are 4 letters.
        </p>
      </main>
    );
  }

  return <RoomClient code={normalized} />;
}
