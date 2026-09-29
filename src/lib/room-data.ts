import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Item,
  Match,
  MatchVote,
  Member,
  QualifyVote,
  Room,
  RoomBundle,
  Vote,
} from "@/lib/types";

const LEGACY_ROOM_COLUMNS =
  "id, slug, name, mode, host_id, votes_per_member, qualify_deadline, qualify_duration_minutes, knockout_size, match_duration_minutes, tie_rule, allow_member_upload, locked, draw_version, seeding_mode, has_password, status, champion_item_id, created_at";

const ROOM_COLUMNS = `${LEGACY_ROOM_COLUMNS}, format, settings, description, anonymous, results_visibility, comments_enabled, reactions_enabled, allow_member_options, template_slug, deadline, result, closed_at`;

const MEMBER_COLUMNS =
  "id, room_id, user_id, display_name, avatar_url, avatar_emoji, is_host, joined_at, kicked_at";

const LEGACY_ITEM_COLUMNS =
  "id, room_id, uploader_member_id, image_url, is_transparent, title, created_at";

const ITEM_COLUMNS = `${LEGACY_ITEM_COLUMNS}, item_type, description, emoji, price_text, place, link, position`;

type QueryError = { message: string; code?: string } | null;

function missingColumn(error: QueryError) {
  return Boolean(error && (error.code === "42703" || /column .* does not exist/i.test(error.message)));
}

async function selectRoom(supabase: SupabaseClient, roomId: string) {
  const attempts = [
    ROOM_COLUMNS,
    LEGACY_ROOM_COLUMNS,
    // Before 0007 there is no has_password column; keep the room usable.
    LEGACY_ROOM_COLUMNS.replace(" has_password,", ""),
  ];
  for (const columns of attempts) {
    const { data, error } = await supabase.from("rooms").select(columns).eq("id", roomId).maybeSingle();
    if (!error) return data as Partial<Room> | null;
    if (!missingColumn(error) && !/has_password/.test(error.message)) return null;
  }
  return null;
}

async function selectItems(supabase: SupabaseClient, roomId: string) {
  const query = (columns: string) =>
    supabase.from("items").select(columns).eq("room_id", roomId).order("created_at", { ascending: true });
  let { data, error } = await query(ITEM_COLUMNS);
  if (missingColumn(error)) ({ data, error } = await query(LEGACY_ITEM_COLUMNS));
  return ((data ?? []) as unknown as Partial<Item>[]).map(
    (item): Item => ({
      ...(item as Item),
      item_type: item.item_type ?? "image",
      description: item.description ?? null,
      emoji: item.emoji ?? null,
      price_text: item.price_text ?? null,
      place: (item.place as Item["place"]) ?? null,
      link: (item.link as Item["link"]) ?? null,
      position: item.position ?? null,
    }),
  );
}

export async function fetchRoomBundle(
  supabase: SupabaseClient,
  roomId: string,
): Promise<RoomBundle | null> {
  const row = await selectRoom(supabase, roomId);
  if (!row) return null;

  const room: Room = {
    ...(row as Room),
    format: row.format ?? "bracket",
    mode: row.mode ?? null,
    locked: Boolean(row.locked),
    draw_version: Number(row.draw_version ?? 0),
    seeding_mode: row.seeding_mode === "manual" ? "manual" : "random",
    has_password: Boolean(row.has_password),
    settings: row.settings ?? {},
    description: row.description ?? null,
    anonymous: Boolean(row.anonymous),
    results_visibility: row.results_visibility ?? "live",
    comments_enabled: row.comments_enabled ?? true,
    reactions_enabled: row.reactions_enabled ?? true,
    allow_member_options: Boolean(row.allow_member_options),
    template_slug: row.template_slug ?? null,
    deadline: row.deadline ?? null,
    result: row.result ?? null,
    closed_at: row.closed_at ?? null,
  };
  const isBracket = room.format === "bracket";

  const [membersRes, items, qualifyRes, votesRes, matchesRes] = await Promise.all([
    supabase
      .from("members")
      .select(MEMBER_COLUMNS)
      .eq("room_id", roomId)
      .is("kicked_at", null)
      .order("joined_at", { ascending: true }),
    selectItems(supabase, roomId),
    isBracket
      ? supabase.from("qualify_votes").select("id, room_id, item_id, member_id").eq("room_id", roomId)
      : Promise.resolve({ data: [] }),
    isBracket
      ? Promise.resolve({ data: [] })
      : supabase.from("votes").select("id, room_id, item_id, member_id, value, created_at").eq("room_id", roomId),
    isBracket
      ? supabase
          .from("matches")
          .select("id, room_id, round, position, item_a, item_b, winner_item_id, deadline, status")
          .eq("room_id", roomId)
          .order("round", { ascending: true })
          .order("position", { ascending: true })
      : Promise.resolve({ data: [] }),
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
    room,
    members: (membersRes.data ?? []) as Member[],
    items: isBracket
      ? items
      : [...items].sort(
          (a, b) => (a.position ?? 0) - (b.position ?? 0) || a.created_at.localeCompare(b.created_at),
        ),
    qualifyVotes: (qualifyRes.data ?? []) as QualifyVote[],
    votes: ((votesRes.data ?? []) as Vote[]).map((vote) => ({ ...vote, value: Number(vote.value) })),
    matches,
    matchVotes,
    serverNow: Date.now(),
  };
}
