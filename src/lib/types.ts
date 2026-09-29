export type RoomMode = "qualify_knockout" | "knockout";
export type RoomStatus = "lobby" | "qualify" | "drawn" | "knockout" | "done";
export type TieRule = "random" | "host";
export type SeedingMode = "random" | "manual";
export type MatchStatus = "pending" | "live" | "done";

export type Room = {
  id: string;
  slug: string;
  name: string;
  mode: RoomMode;
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
  image_url: string;
  is_transparent: boolean;
  title: string | null;
  created_at: string;
};

export type QualifyVote = {
  id: string;
  room_id: string;
  item_id: string;
  member_id: string;
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

export type RoomBundle = {
  room: Room;
  members: Member[];
  items: Item[];
  qualifyVotes: QualifyVote[];
  matches: Match[];
  matchVotes: MatchVote[];
  /** Epoch ms when the bundle was fetched; seeds countdowns so SSR and hydration agree. */
  serverNow: number;
};
