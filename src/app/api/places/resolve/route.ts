import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveMapsUrl } from "@/lib/places/resolve-maps";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const Body = z.object({
  url: z.string().trim().min(1).max(2048),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
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
    const place = await resolveMapsUrl(parsed.data.url);
    return NextResponse.json({
      name: place.name,
      lat: place.lat,
      lng: place.lng,
      mapsUrl: place.mapsUrl,
      hint: place.hint ?? null,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID";
    const status = code === "NOT_MAPS" || code === "INVALID_URL" ? 400 : 502;
    return NextResponse.json({ error: code }, { status });
  }
}
