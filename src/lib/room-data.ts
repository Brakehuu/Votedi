import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Item,
  Match,
  MatchVote,
  Member,
  QualifyVote,
  Room,
  RoomBundle,
  ScheduleAnswer,
  ScheduleNote,
  ScheduleSlot,
  ScheduleTallies,
  ScheduleTripWindows,
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

const SCHEDULE_SLOT_COLUMNS =
  "id, room_id, slot_date, part, start_time, end_time, position, created_at";

type QueryError = { message: string; code?: string } | null;

function missingColumn(error: QueryError) {
  return Boolean(error && (error.code === "42703" || /column .* does not exist/i.test(error.message)));
}

function missingTable(error: QueryError) {
  return Boolean(
    error && (error.code === "42P01" || /relation .* does not exist|Could not find the table/i.test(error.message)),
  );
}

async function selectRoom(supabase: SupabaseClient, roomId: string) {
  const attempts = [
    ROOM_COLUMNS,
    LEGACY_ROOM_COLUMNS,
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

async function selectSchedule(supabase: SupabaseClient, roomId: string) {
  const empty = {
    slots: [] as ScheduleSlot[],
    answers: [] as ScheduleAnswer[],
    notes: [] as ScheduleNote[],
    tallies: null as ScheduleTallies | null,
    tripWindows: null as ScheduleTripWindows | null,
  };
  try {
    const slotsRes = await supabase
      .from("schedule_slots")
      .select(SCHEDULE_SLOT_COLUMNS)
      .eq("room_id", roomId)
      .order("position", { ascending: true });
    if (slotsRes.error) {
      if (missingTable(slotsRes.error) || missingColumn(slotsRes.error)) return empty;
      return empty;
    }
    const slots = (slotsRes.data ?? []).map((row): ScheduleSlot => {
      const s = row as ScheduleSlot;
      return {
        ...s,
        slot_date: String(s.slot_date).slice(0, 10),
        part: s.part ?? null,
        start_time: s.start_time ? String(s.start_time).slice(0, 8) : null,
        end_time: s.end_time ? String(s.end_time).slice(0, 8) : null,
      };
    });
    const slotIds = slots.map((s) => s.id);
    const [answersRes, notesRes, talliesRes, tripRes] = await Promise.all([
      slotIds.length
        ? supabase.from("schedule_answers").select("slot_id, member_id, answer, updated_at").in("slot_id", slotIds)
        : Promise.resolve({ data: [] as ScheduleAnswer[], error: null }),
      supabase.from("schedule_notes").select("room_id, member_id, note, updated_at").eq("room_id", roomId),
      supabase.rpc("get_schedule_tallies", { p_room_id: roomId }),
      supabase.rpc("get_schedule_trip_windows", { p_room_id: roomId }),
    ]);
    let tallies: ScheduleTallies | null = null;
    if (!talliesRes.error && talliesRes.data) {
      const raw = talliesRes.data as ScheduleTallies;
      tallies = {
        visible: Boolean(raw.visible),
        reason: raw.reason,
        anonymous: raw.anonymous,
        slots: (raw.slots ?? []).map((s) => ({
          ...s,
          yes_ids: Array.isArray(s.yes_ids) ? s.yes_ids : [],
          maybe_ids: Array.isArray(s.maybe_ids) ? s.maybe_ids : [],
          no_ids: Array.isArray(s.no_ids) ? s.no_ids : [],
          yes_count: Number(s.yes_count ?? 0),
          maybe_count: Number(s.maybe_count ?? 0),
          no_count: Number(s.no_count ?? 0),
          score: Number(s.score ?? 0),
        })),
      };
    }
    let tripWindows: ScheduleTripWindows | null = null;
    if (!tripRes.error && tripRes.data) {
      const raw = tripRes.data as ScheduleTripWindows;
      tripWindows = {
        visible: Boolean(raw.visible),
        reason: raw.reason,
        anonymous: raw.anonymous,
        windows: (raw.windows ?? []).map((w) => ({
          start: String(w.start).slice(0, 10),
          end: String(w.end).slice(0, 10),
          score: Number(w.score ?? 0),
          full: Number(w.full ?? 0),
          part: Number(w.part ?? 0),
          out: Number(w.out ?? 0),
        })),
      };
    }
    return {
      slots,
      answers: (!answersRes.error ? answersRes.data : []) as ScheduleAnswer[],
      notes: (!notesRes.error ? notesRes.data : []) as ScheduleNote[],
      tallies,
      tripWindows,
    };
  } catch {
    return empty;
  }
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
  const isSchedule = room.format === "schedule";

  const [membersRes, items, qualifyRes, votesRes, matchesRes, schedule] = await Promise.all([
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
    isBracket || isSchedule
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
    isSchedule
      ? selectSchedule(supabase, roomId)
      : Promise.resolve({
          slots: [] as ScheduleSlot[],
          answers: [] as ScheduleAnswer[],
          notes: [] as ScheduleNote[],
          tallies: null as ScheduleTallies | null,
          tripWindows: null as ScheduleTripWindows | null,
        }),
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

  const itemIds = items.map((item) => item.id);
  let reactions: import("@/lib/types").Reaction[] = [];
  let comments: import("@/lib/types").Comment[] = [];
  try {
    const [reactionsRes, commentsRes] = await Promise.all([
      itemIds.length
        ? supabase.from("reactions").select("item_id, member_id, emoji, created_at").in("item_id", itemIds)
        : Promise.resolve({ data: [] as import("@/lib/types").Reaction[], error: null }),
      supabase
        .from("comments")
        .select("id, room_id, item_id, member_id, body, created_at, deleted_at")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true }),
    ]);
    if (!reactionsRes.error) reactions = (reactionsRes.data ?? []) as import("@/lib/types").Reaction[];
    if (!commentsRes.error) comments = (commentsRes.data ?? []) as import("@/lib/types").Comment[];
  } catch {
    /* Phase 2 tables not migrated yet */
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
    reactions,
    comments,
    scheduleSlots: schedule.slots,
    scheduleAnswers: schedule.answers,
    scheduleNotes: schedule.notes,
    scheduleTallies: schedule.tallies,
    scheduleTripWindows: schedule.tripWindows,
    serverNow: Date.now(),
  };
}
