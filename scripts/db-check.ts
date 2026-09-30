/**
 * npm run db:check
 * So sánh RPC/bảng mà code gọi với schema trên Supabase (SUPABASE_SECRET_KEY).
 * In ra mục thiếu + file migration gợi ý.
 */
import { createClient } from "@supabase/supabase-js";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REQUIRED_RPCS = [
  "create_room",
  "create_room_v2",
  "preview_room",
  "og_room_preview",
  "join_room",
  "advance_room",
  "close_room",
  "close_room_if_due",
  "reopen_room",
  "add_options",
  "add_item",
  "update_option",
  "remove_option",
  "cast_vote",
  "remove_vote",
  "clear_my_votes",
  "set_ranking",
  "set_judges",
  "set_schedule_slots",
  "set_schedule_answers",
  "get_schedule_tallies",
  "get_schedule_trip_windows",
  "toggle_reaction",
  "add_comment",
  "delete_comment",
  "cast_qualify_vote",
  "remove_qualify_vote",
  "cast_match_vote",
  "draw_bracket",
  "start_knockout",
  "host_end_round",
  "host_set_bracket",
  "host_shuffle_bracket",
  "host_set_seeding_mode",
  "host_set_locked",
  "host_set_password",
  "host_set_member_upload",
  "host_set_member_options",
  "host_set_anonymous",
  "host_set_results_visibility",
  "host_extend_deadline",
  "host_delete_item",
  "host_rename_item",
  "host_kick_member",
  "submit_feedback",
] as const;

const REQUIRED_TABLES = [
  "rooms",
  "members",
  "items",
  "votes",
  "qualify_votes",
  "matches",
  "match_votes",
  "reactions",
  "comments",
  "schedule_slots",
  "schedule_answers",
  "schedule_notes",
  "room_judges",
  "feedback",
] as const;

/** Gợi ý migration chứa từng RPC/bảng (scan file SQL). */
function migrationHints(migrationsDir: string) {
  const map = new Map<string, string[]>();
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const body = readFileSync(join(migrationsDir, file), "utf8");
    for (const name of [...REQUIRED_RPCS, ...REQUIRED_TABLES]) {
      const rpcHit =
        new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${name}\\b`, "i").test(body) ||
        new RegExp(`function\\s+public\\.${name}\\b`, "i").test(body);
      const tableHit = new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${name}\\b`, "i").test(
        body,
      ) || new RegExp(`create\\s+table\\s+public\\.${name}\\b`, "i").test(body);
      if (rpcHit || tableHit) {
        const list = map.get(name) ?? [];
        if (!list.includes(file)) list.push(file);
        map.set(name, list);
      }
    }
  }
  return map;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SECRET_KEY trong môi trường.");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const migrationsDir = join(process.cwd(), "supabase", "migrations");
  const hints = migrationHints(migrationsDir);

  const missingRpcs: string[] = [];
  const missingTables: string[] = [];

  for (const name of REQUIRED_RPCS) {
    const { error } = await supabase.rpc(name as never, {} as never);
    // PGRST202 = function not found in schema cache
    if (error && (error.code === "PGRST202" || /Could not find the function/i.test(error.message ?? ""))) {
      missingRpcs.push(name);
    }
  }

  for (const name of REQUIRED_TABLES) {
    const { error } = await supabase.from(name).select("*").limit(0);
    if (
      error &&
      (error.code === "PGRST205" ||
        error.code === "42P01" ||
        /Could not find the table|relation .* does not exist|schema cache/i.test(error.message ?? ""))
    ) {
      missingTables.push(name);
    }
  }

  console.log("=== Vote Đi · db:check ===\n");

  if (!missingRpcs.length && !missingTables.length) {
    console.log("OK — đủ RPC và bảng mà code cần.");
    process.exit(0);
  }

  if (missingRpcs.length) {
    console.log("RPC thiếu:");
    for (const name of missingRpcs) {
      const mig = hints.get(name)?.join(", ") ?? "(không tìm thấy trong migrations/)";
      console.log(`  - ${name}  →  chạy: ${mig}`);
    }
    console.log("");
  }

  if (missingTables.length) {
    console.log("Bảng thiếu:");
    for (const name of missingTables) {
      const mig = hints.get(name)?.join(", ") ?? "(không tìm thấy trong migrations/)";
      console.log(`  - ${name}  →  chạy: ${mig}`);
    }
    console.log("");
  }

  const files = new Set<string>();
  for (const name of [...missingRpcs, ...missingTables]) {
    for (const f of hints.get(name) ?? []) files.add(f);
  }
  if (files.size) {
    console.log("Migration cần chạy (theo thứ tự số):");
    for (const f of [...files].sort()) console.log(`  supabase/migrations/${f}`);
  }

  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
