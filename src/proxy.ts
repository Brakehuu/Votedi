import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/update-session";

const BOT_UA =
  /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|Discordbot|Zalo|zalo|WhatsApp|TelegramBot|SkypeUriPreview|Googlebot/i;

export async function proxy(request: NextRequest) {
  const ua = request.headers.get("user-agent") ?? "";
  // Crawlers must get raw HTML/meta without auth redirects or anon cookie churn.
  if (BOT_UA.test(ua)) {
    return NextResponse.next({ request });
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
