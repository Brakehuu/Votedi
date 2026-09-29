import { CreateRoomWizard } from "@/components/create-room/wizard";
import { findFormat } from "@/lib/formats";
import type { FormatId, RoomMode } from "@/lib/types";

export default async function CreateRoomPage({
  searchParams,
}: {
  searchParams: Promise<{ kieu?: string; mode?: string }>;
}) {
  const { kieu, mode } = await searchParams;
  const initialMode: RoomMode | null =
    mode === "knockout" || mode === "qualify_knockout" ? mode : null;
  const picked = findFormat(kieu);
  const initialFormat: FormatId | null = picked?.available ? picked.id : initialMode ? "bracket" : null;
  return <CreateRoomWizard initialFormat={initialFormat} initialMode={initialMode} />;
}
