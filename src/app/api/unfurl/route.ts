import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { unfurlUrl } from "@/lib/unfurl";

export const runtime = "nodejs";

const Body = z.object({
  url: z.string().trim().url().max(2048),
});

/** Simple in-memory rate limit: 20 / minute / user. */
const buckets = new Map<string, { count: number; reset: number }>();

function rateLimit(userId: string): boolean {
  const now = Date.now();
  const row = buckets.get(userId);
  if (!row || now >= row.reset) {
    buckets.set(userId, { count: 1, reset: now + 60_000 });
    return true;
  }
  if (row.count >= 20) return false;
  row.count += 1;
  return true;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  if (!rateLimit(user.id)) {
    return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID" }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID" }, { status: 400 });
  }

  try {
    const result = await unfurlUrl(parsed.data.url);
    return NextResponse.json({
      url: result.url,
      title: result.title,
      siteName: result.siteName,
      description: result.description,
      imageUrl: result.imageUrl,
      image: result.image ?? null,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "FETCH_FAILED";
    // Soft-fail: return domain-only card so the client can still create a link option.
    let host: string | null = null;
    try {
      host = new URL(parsed.data.url).hostname.replace(/^www\./, "");
    } catch {
      host = null;
    }
    if (
      code === "PRIVATE_IP" ||
      code === "DNS_FAILED" ||
      code === "INVALID_URL" ||
      code === "TOO_MANY_REDIRECTS"
    ) {
      return NextResponse.json({ error: code }, { status: 400 });
    }
    return NextResponse.json({
      url: parsed.data.url,
      title: null,
      siteName: host,
      description: null,
      imageUrl: null,
      image: null,
      soft: true,
      error: code,
    });
  }
}
