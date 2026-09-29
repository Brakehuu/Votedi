import { NextResponse } from "next/server";
import { z } from "zod";
import { isMapsUrlString } from "@/lib/places/classify-line";
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

  const raw = parsed.data.url;
  if (!isMapsUrlString(raw)) {
    return NextResponse.json({ error: "NOT_MAPS" }, { status: 400 });
  }

  try {
    const place = await resolveMapsUrl(raw);
    // Soft-success: always return a place payload so the client can create a place card.
    return NextResponse.json({
      name: place.name,
      lat: place.lat,
      lng: place.lng,
      mapsUrl: place.mapsUrl || raw,
      hint: place.hint ?? null,
      incomplete: !place.name || place.lat == null || place.lng == null,
    });
  } catch (error) {
    console.error("[api/places/resolve]", raw.slice(0, 120), error);
    // Still soft-fail for known Maps URLs so UI can create an editable place card
    if (isMapsUrlString(raw)) {
      return NextResponse.json({
        name: null,
        lat: null,
        lng: null,
        mapsUrl: raw,
        hint: error instanceof Error ? error.message : "RESOLVE_FAILED",
        incomplete: true,
      });
    }
    const code = error instanceof Error ? error.message : "INVALID";
    return NextResponse.json({ error: code }, { status: 400 });
  }
}
