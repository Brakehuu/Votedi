import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RoomScreen } from "@/components/room/room-screen";
import { SetupNotice } from "@/components/setup-notice";
import { fetchRoomBundle } from "@/lib/room-data";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { Member, RoomPreview } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ moi?: string }>;
}) {
  const { slug } = await params;
  const { moi } = await searchParams;

  if (!isSupabaseConfigured()) return <SetupNotice />;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("preview_room", { p_slug: slug });
  if (error) return <SetupNotice detail={error.message} />;

  const preview = ((data ?? []) as RoomPreview[])[0];
  if (!preview) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let member: Member | null = null;
  let bundle = null;
  if (user) {
    const { data: memberRow } = await supabase
      .from("members")
      .select("id, room_id, user_id, display_name, avatar_url, avatar_emoji, is_host, joined_at, kicked_at")
      .eq("room_id", preview.id)
      .eq("user_id", user.id)
      .maybeSingle();
    const row = memberRow as Member | null;
    if (row?.kicked_at) {
      return (
        <main className="mx-auto max-w-lg px-4 py-16">
          <div className="glass space-y-3 rounded-[22px] p-6">
            <h1 className="text-2xl font-extrabold">Bạn đã bị mời ra</h1>
            <p className="text-muted-foreground">
              Chủ phòng đã kick bạn khỏi “{preview.name}”. Liên hệ chủ phòng nếu muốn vào lại.
            </p>
          </div>
        </main>
      );
    }
    member = row;
    if (member) {
      await supabase.rpc("advance_room", { p_room_id: preview.id, p_host_start: false });
      bundle = await fetchRoomBundle(supabase, preview.id);
    }
  }

  return <RoomScreen preview={preview} member={member} initial={bundle} showShare={moi === "1"} />;
}
