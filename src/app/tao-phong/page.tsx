import { CreateRoomWizard } from "@/components/create-room/wizard";
import { findFormat } from "@/lib/formats";
import { getTemplate } from "@/lib/templates";
import type { FormatId, RoomMode } from "@/lib/types";

export default async function CreateRoomPage({
  searchParams,
}: {
  searchParams: Promise<{ kieu?: string; mode?: string; mau?: string }>;
}) {
  const { kieu, mode, mau } = await searchParams;
  const initialTemplate = getTemplate(mau);
  const initialMode: RoomMode | null =
    initialTemplate?.mode ??
    (mode === "knockout" || mode === "qualify_knockout" || mode === "group_knockout" ? mode : null);
  const picked = findFormat(kieu) ?? (initialTemplate ? findFormat(initialTemplate.format) : null);
  const initialFormat: FormatId | null = picked?.available
    ? picked.id
    : initialMode
      ? "bracket"
      : null;
  return (
    <div>
      <CreateRoomWizard
        initialFormat={initialFormat}
        initialMode={initialMode}
        initialTemplate={initialTemplate}
      />
    </div>
  );
}
