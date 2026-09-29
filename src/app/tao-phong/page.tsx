import { CreateRoomWizard } from "@/components/create-room/wizard";
import type { RoomMode } from "@/lib/types";

export default async function CreateRoomPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const initialMode: RoomMode | null =
    mode === "knockout" || mode === "qualify_knockout" ? mode : null;
  return <CreateRoomWizard initialMode={initialMode} />;
}
