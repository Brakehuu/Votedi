export type FormatId = "quick" | "bracket" | "schedule" | "swipe" | "ranking" | "rating";
export type RoomMode = "qualify_knockout" | "knockout";
export type RoomStatus = "lobby" | "qualify" | "drawn" | "knockout" | "done" | "open" | "closed";
export type TieRule = "random" | "host";
export type SeedingMode = "random" | "manual";
export type MatchStatus = "pending" | "live" | "done";
export type ItemType = "image" | "text" | "place" | "link";
export type ResultsVisibility = "live" | "after_vote" | "after_close";

export type ScheduleMode = "days" | "day_parts" | "time_slots" | "trip";
export type ScheduleDayPart = "morning" | "afternoon" | "evening";
export type ScheduleAnswerValue = "yes" | "maybe" | "no";

export type RoomSettings = {
  max_choices?: number;
  tie_rule?: TieRule;
  /** Restrict option UI: 'place' = vote địa điểm mode. */
  option_kind?: "place" | "any";
  template_slug?: string;
  schedule_mode?: ScheduleMode;
  trip_length?: number;
  day_parts?: ScheduleDayPart[];
  time_slots?: { start: string; end: string }[];
};

export type PlaceData = {
  name?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  maps_url?: string | null;
  /** Optional booking / listing URL (Booking, Agoda, Airbnb…). */
  booking_url?: string | null;
  note?: string | null;
};

export type LinkData = {
  url: string;
  title?: string | null;
  image_url?: string | null;
  site_name?: string | null;
};

export type RoomResultRow = {
  item_id?: string;
  slot_id?: string;
  score: number;
  votes?: number;
  yes?: number;
  maybe?: number;
  yes_count?: number;
  maybe_count?: number;
  start?: string;
  end?: string;
  part?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  position?: number;
};

export type RoomResult = {
  format: FormatId;
  winner_item_id: string | null;
  winner_slot_id?: string | null;
  winner_start?: string | null;
  winner_end?: string | null;
  winner_label?: string | null;
  tied: boolean;
  board: RoomResultRow[];
  closed_at: string;
};

export type ScheduleSlot = {
  id: string;
  room_id: string;
  slot_date: string;
  part: ScheduleDayPart | null;
  start_time: string | null;
  end_time: string | null;
  position: number;
  created_at?: string;
};

export type ScheduleAnswer = {
  slot_id: string;
  member_id: string;
  answer: ScheduleAnswerValue;
  updated_at?: string;
};

export type ScheduleNote = {
  room_id: string;
  member_id: string;
  note: string;
  updated_at?: string;
};

export type ScheduleTallySlot = {
  slot_id: string;
  slot_date?: string;
  part?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  position?: number;
  yes_count: number;
  maybe_count: number;
  no_count: number;
  score: number;
  yes_ids: string[];
  maybe_ids: string[];
  no_ids: string[];
};

export type ScheduleTallies = {
  visible: boolean;
  reason?: string;
  anonymous?: boolean;
  slots: ScheduleTallySlot[];
};

export type ScheduleTripWindowRow = {
  start: string;
  end: string;
  score: number;
  full: number;
  part: number;
  out: number;
};

export type ScheduleTripWindows = {
  visible: boolean;
  reason?: string;
  anonymous?: boolean;
  windows: ScheduleTripWindowRow[];
};

export type Room = {
  id: string;
  slug: string;
  name: string;
  format: FormatId;
  /** Bracket variant; null for non-bracket rooms. */
  mode: RoomMode | null;
  host_id: string;
  votes_per_member: number;
  qualify_deadline: string | null;
  qualify_duration_minutes: number | null;
  knockout_size: number;
  match_duration_minutes: number;
  tie_rule: TieRule;
  allow_member_upload: boolean;
  locked: boolean;
  draw_version: number;
  seeding_mode: SeedingMode;
  has_password: boolean;
  status: RoomStatus;
  champion_item_id: string | null;
  created_at: string;
  settings: RoomSettings;
  description: string | null;
  anonymous: boolean;
  results_visibility: ResultsVisibility;
  comments_enabled: boolean;
  reactions_enabled: boolean;
  allow_member_options: boolean;
  template_slug: string | null;
  deadline: string | null;
  result: RoomResult | null;
  closed_at: string | null;
};

export type RoomPreview = {
  id: string;
  slug: string;
  name: string;
  status: RoomStatus;
  locked?: boolean;
  has_password?: boolean;
};

export type Member = {
  id: string;
  room_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  avatar_emoji: string | null;
  is_host: boolean;
  joined_at: string;
  kicked_at: string | null;
};

export type Item = {
  id: string;
  room_id: string;
  uploader_member_id: string | null;
  item_type: ItemType;
  /** Always set for image items; optional preview for place/link. */
  image_url: string | null;
  is_transparent: boolean;
  title: string | null;
  description: string | null;
  emoji: string | null;
  price_text: string | null;
  place: PlaceData | null;
  link: LinkData | null;
  position: number | null;
  created_at: string;
};

export type QualifyVote = {
  id: string;
  room_id: string;
  item_id: string;
  member_id: string;
};

export type Vote = {
  id: string;
  room_id: string;
  item_id: string;
  member_id: string;
  value: number;
  created_at: string;
};

export type Match = {
  id: string;
  room_id: string;
  round: number;
  position: number;
  item_a: string | null;
  item_b: string | null;
  winner_item_id: string | null;
  deadline: string | null;
  status: MatchStatus;
};

export type MatchVote = {
  id: string;
  match_id: string;
  member_id: string;
  item_id: string;
};

export type Reaction = {
  item_id: string;
  member_id: string;
  emoji: string;
  created_at?: string;
};

export type Comment = {
  id: string;
  room_id: string;
  item_id: string | null;
  member_id: string;
  body: string;
  created_at: string;
  deleted_at: string | null;
};

export type RoomBundle = {
  room: Room;
  members: Member[];
  items: Item[];
  qualifyVotes: QualifyVote[];
  votes: Vote[];
  matches: Match[];
  matchVotes: MatchVote[];
  reactions: Reaction[];
  comments: Comment[];
  scheduleSlots: ScheduleSlot[];
  scheduleAnswers: ScheduleAnswer[];
  scheduleNotes: ScheduleNote[];
  scheduleTallies: ScheduleTallies | null;
  scheduleTripWindows: ScheduleTripWindows | null;
  /** Epoch ms when the bundle was fetched; seeds countdowns so SSR and hydration agree. */
  serverNow: number;
};
