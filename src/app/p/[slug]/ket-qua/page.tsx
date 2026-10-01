import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteFooter } from "@/components/home/footer";
import { ResultsActions } from "@/components/room/results-actions";
import { ResultsView } from "@/components/room/results-view";
import { fetchRoomBundle } from "@/lib/room-data";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { deriveThirdPlace, roundCount } from "@/lib/bracket";
import { SetupNotice } from "@/components/setup-notice";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Kết quả phòng",
};

export default async function ResultsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("preview_room", { p_slug: slug });
  if (error) return <SetupNotice detail={error.message} />;
  const preview = ((data ?? []) as { id: string; slug: string; name: string; status: string }[])[0];
  if (!preview) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <div className="glass rounded-[22px] p-6">
          <h1 className="text-2xl font-extrabold">Cần vào phòng trước</h1>
          <p className="mt-2 text-muted-foreground">Mở link phòng, vào phòng (nhập mật khẩu nếu có) rồi xem lại kết quả.</p>
          <Link href={`/p/${slug}`} className="btn btn-primary mt-4 inline-flex">
            Vào phòng
          </Link>
        </div>
      </main>
    );
  }

  const { data: member } = await supabase
    .from("members")
    .select("id, kicked_at")
    .eq("room_id", preview.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member || member.kicked_at) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <div className="glass rounded-[22px] p-6">
          <h1 className="text-2xl font-extrabold">Không xem được kết quả</h1>
          <p className="mt-2 text-muted-foreground">Bạn chưa là thành viên phòng này hoặc đã bị kick.</p>
          <Link href={`/p/${slug}`} className="btn btn-primary mt-4 inline-flex">
            Thử vào phòng
          </Link>
        </div>
      </main>
    );
  }

  const bundle = await fetchRoomBundle(supabase, preview.id);
  if (!bundle) return <SetupNotice detail="Không tải được dữ liệu phòng." />;
  if (
    bundle.room.format !== "bracket" &&
    bundle.room.format !== "quick" &&
    bundle.room.format !== "swipe" &&
    bundle.room.format !== "ranking" &&
    bundle.room.format !== "rating"
  ) {
    redirect(`/p/${slug}`);
  }

  if (
    bundle.room.format === "quick" ||
    bundle.room.format === "swipe" ||
    bundle.room.format === "ranking" ||
    bundle.room.format === "rating"
  ) {
    const { getFormat } = await import("@/lib/formats");
    const { OptionCard, optionTitle } = await import("@/components/options/option-card");
    const { directionsUrl } = await import("@/components/options/place-map");
    const { computeSwipeResults } = await import("@/lib/swipe");
    const { computeBordaResults } = await import("@/lib/ranking");
    const { computeRatingResults } = await import("@/lib/rating");
    const format = getFormat(bundle.room.format);
    const fmt = bundle.room.format;

    let rows: { item: (typeof bundle.items)[number]; score: number; votes: number; extra?: string }[] = [];
    if (fmt === "swipe") {
      rows = computeSwipeResults(bundle.items, bundle.votes, bundle.members).map((r) => ({
        item: r.item,
        score: r.score,
        votes: r.likes + r.supers,
        extra: r.matchAll ? "Match cả nhóm 🎉" : r.supers ? `${r.supers} 🔥` : undefined,
      }));
    } else if (fmt === "ranking") {
      rows = computeBordaResults(bundle.items, bundle.votes).map((r) => ({
        item: r.item,
        score: r.score,
        votes: r.votes,
        extra: r.avgRank != null ? `hạng TB ${r.avgRank.toFixed(2)}` : undefined,
      }));
    } else if (fmt === "rating") {
      const judgeIds = new Set<string>();
      try {
        const { data: j } = await supabase.from("room_judges").select("member_id").eq("room_id", bundle.room.id);
        for (const row of j ?? []) judgeIds.add(row.member_id as string);
      } catch {
        /* ignore */
      }
      rows = computeRatingResults(
        bundle.items,
        bundle.votes,
        judgeIds,
        bundle.room.settings.judge_weight ?? 0.5,
      ).map((r) => ({
        item: r.item,
        score: r.score,
        votes: r.votes,
        extra:
          r.judgeScore != null
            ? `GK ${r.judgeScore.toFixed(1)} · KG ${r.audienceScore?.toFixed(1) ?? "—"}`
            : undefined,
      }));
    } else {
      rows = (format.computeResults?.(bundle.items, bundle.votes) ?? []).map((r) => ({
        item: r.item,
        score: r.score,
        votes: r.votes,
      }));
    }

    const winnerId = bundle.room.result?.winner_item_id ?? bundle.room.champion_item_id;
    const winner = rows.find((row) => row.item.id === winnerId)?.item ?? rows[0]?.item;
    return (
      <>
        <main className="mx-auto w-full max-w-lg space-y-6 px-4 py-8 pb-24">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary">Kết quả · {format.name}</p>
              <h1 className="text-3xl font-extrabold tracking-tight">{bundle.room.name}</h1>
            </div>
            <ResultsActions slug={slug} roomName={bundle.room.name} />
          </div>
          {bundle.room.status !== "closed" ? (
            <p className="glass rounded-[22px] p-4 text-sm text-muted-foreground">
              Phòng chưa chốt.{" "}
              <Link href={`/p/${slug}`} className="font-semibold text-primary">
                Vào phòng để vote
              </Link>
            </p>
          ) : null}
          {winner ? (
            <section className="glass space-y-3 rounded-[22px] p-4">
              <p className="text-sm font-semibold text-primary">Lựa chọn thắng</p>
              <OptionCard option={winner} badge="#1" selected showMap />
              <p className="text-2xl font-extrabold">{optionTitle(winner)}</p>
              {winner.item_type === "place" && winner.place?.lat != null && winner.place?.lng != null ? (
                <a
                  className="btn btn-primary inline-flex min-h-11"
                  href={directionsUrl(winner.place.lat, winner.place.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Chỉ đường
                </a>
              ) : null}
              {winner.item_type === "link" && winner.link?.url ? (
                <a
                  className="btn btn-primary inline-flex min-h-11"
                  href={winner.link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Mở link
                </a>
              ) : null}
            </section>
          ) : null}
          {fmt === "ranking" && rows.length >= 2 ? (
            <section>
              <h2 className="mb-2 text-xl font-extrabold">Bục podium</h2>
              <div className="grid grid-cols-3 items-end gap-2">
                {[rows[1], rows[0], rows[2]].map((row, idx) =>
                  row ? (
                    <div
                      key={row.item.id}
                      className={`glass rounded-[18px] p-3 text-center ${idx === 1 ? "pb-5 ring-2 ring-primary/30" : ""}`}
                    >
                      <p className="truncate text-sm font-bold">{optionTitle(row.item)}</p>
                      <span className="text-xs text-muted-foreground">{row.score} điểm</span>
                    </div>
                  ) : (
                    <div key={idx} />
                  ),
                )}
              </div>
            </section>
          ) : null}
          <section className="space-y-2">
            <h2 className="text-xl font-extrabold">Bảng xếp hạng</h2>
            <ol className="space-y-2">
              {rows.map((row, index) => (
                <li key={row.item.id} className="glass flex items-center gap-3 rounded-[18px] p-3">
                  <span className="grid size-9 place-items-center rounded-full bg-foreground text-sm font-extrabold text-background">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{optionTitle(row.item)}</p>
                    <p className="text-sm text-muted-foreground">
                      {fmt === "rating"
                        ? `${row.score.toFixed(1)} · ${row.votes} lượt`
                        : fmt === "ranking"
                          ? `${row.score} điểm`
                          : `${row.score} điểm · ${row.votes} thích`}
                      {row.extra ? ` · ${row.extra}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <Link href={`/p/${slug}`} className="btn btn-dark inline-flex min-h-11">
            Quay lại phòng
          </Link>
        </main>
        <SiteFooter />
      </>
    );
  }

  const champion = bundle.items.find((item) => item.id === bundle.room.champion_item_id);
  const finalRound = roundCount(bundle.room.knockout_size);
  const finalMatch = bundle.matches.find((match) => match.round === finalRound && match.status === "done");
  const runnerUpId =
    finalMatch && champion
      ? finalMatch.item_a === champion.id
        ? finalMatch.item_b
        : finalMatch.item_a
      : null;
  const runnerUp = bundle.items.find((item) => item.id === runnerUpId);

  const qualifyCounts = new Map<string, number>();
  for (const vote of bundle.qualifyVotes) {
    qualifyCounts.set(vote.item_id, (qualifyCounts.get(vote.item_id) ?? 0) + 1);
  }
  const qualifyRankIds = [...bundle.items]
    .map((item) => ({ id: item.id, votes: qualifyCounts.get(item.id) ?? 0, created: item.created_at }))
    .sort((a, b) => b.votes - a.votes || a.created.localeCompare(b.created))
    .map((r) => r.id);

  const third = deriveThirdPlace({
    items: bundle.items,
    matches: bundle.matches,
    knockoutSize: bundle.room.knockout_size,
    championId: champion?.id,
    runnerUpId,
    qualifyRankIds: bundle.qualifyVotes.length > 0 ? qualifyRankIds : undefined,
  });

  return (
    <>
      <ResultsView
        slug={slug}
        room={bundle.room}
        items={bundle.items}
        members={bundle.members}
        matches={bundle.matches}
        matchVotes={bundle.matchVotes}
        qualifyVotes={bundle.qualifyVotes}
        champion={champion}
        runnerUp={runnerUp}
        third={third}
      />
      <SiteFooter />
    </>
  );
}
