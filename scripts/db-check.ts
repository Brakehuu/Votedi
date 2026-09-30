/**
 * npm run db:check
 * So sánh RPC/bảng mà code cần với OpenAPI của PostgREST
 * (GET {SUPABASE_URL}/rest/v1/ với apikey + Authorization).
 */
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
  "duplicate_room",
  "delete_room",
  "list_my_rooms",
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

function trimEnv(value: string | undefined) {
  return (value ?? "").replace(/\r/g, "").trim();
}

function migrationHints(migrationsDir: string) {
  const map = new Map<string, string[]>();
  let files: string[] = [];
  try {
    files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  } catch {
    return map;
  }
  for (const file of files) {
    const body = readFileSync(join(migrationsDir, file), "utf8");
    for (const name of [...REQUIRED_RPCS, ...REQUIRED_TABLES]) {
      const rpcHit =
        new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${name}\\b`, "i").test(body) ||
        new RegExp(`function\\s+public\\.${name}\\b`, "i").test(body);
      const tableHit =
        new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${name}\\b`, "i").test(body) ||
        new RegExp(`create\\s+table\\s+public\\.${name}\\b`, "i").test(body);
      if (rpcHit || tableHit) {
        const list = map.get(name) ?? [];
        if (!list.includes(file)) list.push(file);
        map.set(name, list);
      }
    }
  }
  return map;
}

type OpenApiDoc = {
  paths?: Record<string, unknown>;
  definitions?: Record<string, unknown>;
  components?: { schemas?: Record<string, unknown> };
};

function collectFromOpenApi(doc: OpenApiDoc) {
  const rpcs = new Set<string>();
  const tables = new Set<string>();
  for (const path of Object.keys(doc.paths ?? {})) {
    const rpc = path.match(/^\/rpc\/([a-zA-Z0-9_]+)/);
    if (rpc?.[1]) {
      rpcs.add(rpc[1]);
      continue;
    }
    const table = path.match(/^\/([a-zA-Z0-9_]+)$/);
    if (table?.[1] && table[1] !== "rpc") tables.add(table[1]);
  }
  for (const name of Object.keys(doc.definitions ?? {})) {
    if (!name.includes(".")) tables.add(name);
  }
  for (const name of Object.keys(doc.components?.schemas ?? {})) {
    if (!name.includes(".")) tables.add(name);
  }
  return { rpcs, tables };
}

async function main() {
  const url = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/$/, "");
  const key = trimEnv(process.env.SUPABASE_SECRET_KEY);
  if (!url || !key) {
    console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SECRET_KEY trong môi trường.");
    process.exit(1);
  }

  console.log("=== Vote Đi · db:check ===\n");

  let res: Response;
  try {
    res = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/openapi+json, application/json",
      },
    });
  } catch (err) {
    console.error("Không kết nối được DB:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  if (res.status === 401 || res.status === 403) {
    console.error("Không kết nối được DB (HTTP", res.status, ") — kiểm tra SUPABASE_SECRET_KEY.");
    process.exit(1);
  }
  if (!res.ok) {
    console.error("Không kết nối được DB (HTTP", res.status, ").");
    process.exit(1);
  }

  let doc: OpenApiDoc;
  try {
    doc = (await res.json()) as OpenApiDoc;
  } catch {
    console.error("Không kết nối được DB (OpenAPI không đọc được).");
    process.exit(1);
  }

  const { rpcs, tables } = collectFromOpenApi(doc);
  const migrationsDir = join(process.cwd(), "supabase", "migrations");
  const hints = migrationHints(migrationsDir);

  const missingRpcs = REQUIRED_RPCS.filter((name) => !rpcs.has(name));
  const missingTables = REQUIRED_TABLES.filter((name) => !tables.has(name));

  if (!missingRpcs.length && !missingTables.length) {
    console.log(`OK — đủ ${REQUIRED_RPCS.length} RPC và ${REQUIRED_TABLES.length} bảng.`);
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
  console.error("Không kết nối được DB:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
