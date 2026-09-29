import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Item,
  Match,
  MatchVote,
  Member,
  QualifyVote,
  Room,
  RoomBundle,
} from "@/lib/types";

const ROOM_COLUMNS =
  "id, slug, name, mode, host_id, votes_per_member, qualify_deadline, qualify_duration_minutes, knockout_size, match_duration_minutes, tie_rule, allow_member_upload, locked, draw_version, seeding_mode, has_password, status, champion_item_id, created_at";

const MEMBER_COLUMNS =
  "id, room_id, user_id, display_name, avatar_url, avatar_emoji, is_host, joined_at, kicked_at";

const ITEM_COLUMNS =
  "id, room_id, uploader_member_id, image_url, is_transparent, title, created_at";

export async function fetchRoomBundle(
  supabase: SupabaseClient,
  roomId: string,
): Promise<RoomBundle | null> {
  let { data: room, error: roomError } = await supabase
    .from("rooms")
    .select(ROOM_COLUMNS)
    .eq("id", roomId)
    .maybeSingle();

  // Before 0007 there is no has_password column; keep the room usable.
  if (roomError && /has_password/.test(roomError.message)) {
    ({ data: room, error: roomError } = await supabase
      .from("rooms")
      .select(ROOM_COLUMNS.replace(" has_password,", ""))
      .eq("id", roomId)
      .maybeSingle());
  }

  if (roomError || !room) return null;

  const [membersRes, itemsRes, votesRes, matchesRes] = await Promise.all([
    supabase
      .from("members")
      .select(MEMBER_COLUMNS)
      .eq("room_id", roomId)
      .is("kicked_at", null)
      .order("joined_at", { ascending: true }),
    supabase
      .from("items")
      .select(ITEM_COLUMNS)
      .eq("room_id", roomId)
      .order("created_at", { ascending: true }),
    supabase.from("qualify_votes").select("id, room_id, item_id, member_id").eq("room_id", roomId),
    supabase
      .from("matches")
      .select("id, room_id, round, position, item_a, item_b, winner_item_id, deadline, status")
      .eq("room_id", roomId)
      .order("round", { ascending: true })
      .order("position", { ascending: true }),
  ]);

  const matches = (matchesRes.data ?? []) as Match[];
  let matchVotes: MatchVote[] = [];
  if (matches.length > 0) {
    const { data } = await supabase
      .from("match_votes")
      .select("id, match_id, member_id, item_id")
      .in(
        "match_id",
        matches.map((match) => match.id),
      );
    matchVotes = (data ?? []) as MatchVote[];
  }

  return {
    room: {
      ...(room as Room),
      locked: Boolean((room as Room).locked),
      draw_version: Number((room as Room).draw_version ?? 0),
      seeding_mode: (room as Room).seeding_mode === "manual" ? "manual" : "random",
      has_password: Boolean((room as Room).has_password),
    },
    members: (membersRes.data ?? []) as Member[],
    items: (itemsRes.data ?? []) as Item[],
    qualifyVotes: (votesRes.data ?? []) as QualifyVote[],
    matches,
    matchVotes,
    serverNow: Date.now(),
  };
}
