import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RoomScreen } from "@/components/room/room-screen";
import { SetupNotice } from "@/components/setup-notice";
import { getFormat } from "@/lib/formats";
import { fetchRoomBundle } from "@/lib/room-data";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { createSecretClient } from "@/lib/supabase/secret";
import type { Member, RoomPreview } from "@/lib/types";

export const dynamic = "force-dynamic";

type OgPreview = {
  name: string;
  format: string;
  item_count: number;
  member_count: number;
  has_password: boolean;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://votedi.vn";
  let title = "Vote giúp nhóm";
  let description = "Bấm để vote, không cần tài khoản.";
  const secret = createSecretClient();
  if (secret) {
    try {
      const { data } = await secret.rpc("og_room_preview", { p_slug: slug });
      const preview = data as OgPreview | null;
      if (preview) {
        title = `Vote giúp nhóm: ${preview.name}`;
        const formatName = getFormat(preview.format).name;
        description = `${formatName} · ${preview.item_count} lựa chọn · ${preview.member_count} người đã tham gia. Bấm để vote, không cần tài khoản.`;
      }
    } catch {
      /* fallback */
    }
  }
  const url = `${site.replace(/\/$/, "")}/p/${slug}`;
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: "Vote Đi",
      locale: "vi_VN",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

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
      await Promise.all([
        supabase.rpc("advance_room", { p_room_id: preview.id, p_host_start: false }),
        supabase.rpc("close_room_if_due", { p_room_id: preview.id }),
      ]);
      bundle = await fetchRoomBundle(supabase, preview.id);
    }
  }

  return <RoomScreen preview={preview} member={member} initial={bundle} showShare={moi === "1"} />;
}
