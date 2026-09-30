import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSecretClient } from "@/lib/supabase/secret";
import { errorMessage } from "@/lib/errors";

const Body = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(120),
  message: z.string().trim().min(1).max(2000),
  company: z.string().optional(), // honeypot
  page: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload không hợp lệ." }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Thông tin chưa hợp lệ." }, { status: 400 });
  }

  const supabase = createSecretClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server chưa cấu hình Supabase." }, { status: 503 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 32);
  const ua = request.headers.get("user-agent") ?? "";

  const { error } = await supabase.rpc("submit_feedback", {
    p_name: parsed.data.name,
    p_email: parsed.data.email,
    p_message: parsed.data.message,
    p_page: parsed.data.page ?? "/lien-he",
    p_honeypot: parsed.data.company ?? "",
    p_ip_hash: ipHash,
    p_user_agent: ua.slice(0, 400),
  });

  if (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
