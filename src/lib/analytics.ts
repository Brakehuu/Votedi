/** Anonymous product events — no PII. */
export type AnalyticsEvent =
  | "create_room"
  | "join_room"
  | "vote"
  | "close_room"
  | "share";

export function track(event: AnalyticsEvent, props?: Record<string, string | number | boolean | undefined>) {
  try {
    const clean: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(props ?? {})) {
      if (v === undefined) continue;
      // never send names, emails, ids that look like UUIDs of users
      if (/email|name|password|token/i.test(k)) continue;
      clean[k] = v;
    }
    void import("@vercel/analytics").then(({ track: vaTrack }) => {
      vaTrack(event, clean);
    });
  } catch {
    /* ignore */
  }
}
