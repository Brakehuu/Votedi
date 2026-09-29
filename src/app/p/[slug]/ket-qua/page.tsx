import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BracketBoard } from "@/components/bracket/bracket-board";
import { MemberAvatar } from "@/components/room/member-avatar";
import { SiteFooter } from "@/components/home/footer";
import { ResultsActions } from "@/components/room/results-actions";
import { ZoomableItemImage } from "@/components/room/zoomable-item-image";
import { fetchRoomBundle } from "@/lib/room-data";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { roundCount, roundLabel } from "@/lib/bracket";
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
  if (bundle.room.format !== "bracket") redirect(`/p/${slug}`);

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
  const qualifyRank = [...bundle.items]
    .map((item) => ({ item, votes: qualifyCounts.get(item.id) ?? 0 }))
    .sort((a, b) => b.votes - a.votes || a.item.created_at.localeCompare(b.item.created_at));

  const memberById = new Map(bundle.members.map((m) => [m.id, m]));

  return (
    <>
      <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 pb-24">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-primary">Kết quả chi tiết</p>
            <h1 className="text-3xl font-extrabold tracking-tight">{bundle.room.name}</h1>
          </div>
          <ResultsActions slug={slug} roomName={bundle.room.name} />
        </div>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="glass rounded-[22px] p-4">
            <p className="text-sm font-semibold text-primary">Vô địch</p>
            {champion ? (
              <>
                <div className="mt-3 max-w-[220px]">
                  <ZoomableItemImage item={champion} items={bundle.items} />
                </div>
                <p className="mt-3 text-xl font-extrabold">{champion.title || "Mẫu vô địch"}</p>
              </>
            ) : (
              <p className="mt-3 text-muted-foreground">Phòng chưa chốt vô địch.</p>
            )}
          </div>
          <div className="glass rounded-[22px] p-4">
            <p className="text-sm font-semibold text-muted-foreground">Á quân</p>
            {runnerUp ? (
              <>
                <div className="mt-3 max-w-[180px] opacity-90">
                  <ZoomableItemImage item={runnerUp} items={bundle.items} />
                </div>
                <p className="mt-3 text-lg font-bold">{runnerUp.title || "Á quân"}</p>
              </>
            ) : (
              <p className="mt-3 text-muted-foreground">Chưa có á quân.</p>
            )}
          </div>
        </section>

        {bundle.room.mode === "qualify_knockout" && qualifyRank.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold">Bảng xếp hạng vòng loại</h2>
            <ol className="space-y-2">
              {qualifyRank.map((row, index) => {
                const voters = bundle.qualifyVotes
                  .filter((vote) => vote.item_id === row.item.id)
                  .map((vote) => memberById.get(vote.member_id))
                  .filter((m): m is NonNullable<typeof m> => Boolean(m));
                return (
                  <li key={row.item.id} className="glass flex flex-wrap items-center gap-3 rounded-[18px] p-3">
                    <span className="grid size-9 place-items-center rounded-full bg-foreground text-sm font-extrabold text-background">
                      {index + 1}
                    </span>
                    <div className="w-14 shrink-0">
                      <ZoomableItemImage item={row.item} items={qualifyRank.map((entry) => entry.item)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{row.item.title || "Mẫu"}</p>
                      <p className="text-sm text-muted-foreground">{row.votes} phiếu</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {voters.map((member) => (
                          <span
                            key={member.id}
                            className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/70 py-0.5 pr-2 pl-0.5 text-xs font-semibold"
                          >
                            <MemberAvatar member={member} className="size-6 text-[10px]" />
                            <span className="truncate">{member.display_name}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ) : null}

        {bundle.matches.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold">Sơ đồ đã đấu</h2>
            <div className="ko-board-shell glass overflow-x-auto rounded-[28px] p-3">
              <BracketBoard
                size={bundle.room.knockout_size}
                matches={bundle.matches}
                items={bundle.items}
                members={bundle.members}
                matchVotes={bundle.matchVotes}
                meId=""
                championItemId={bundle.room.champion_item_id}
                preview
              />
            </div>
          </section>
        ) : null}

        <section className="space-y-4">
          <h2 className="text-xl font-extrabold">Chi tiết từng cặp</h2>
          {bundle.matches
            .filter((match) => match.status === "done")
            .map((match) => {
              const a = bundle.items.find((item) => item.id === match.item_a);
              const b = bundle.items.find((item) => item.id === match.item_b);
              const votes = bundle.matchVotes.filter((vote) => vote.match_id === match.id);
              return (
                <article key={match.id} className="glass rounded-[22px] p-4">
                  <p className="text-sm font-semibold text-muted-foreground">
                    {roundLabel(match.round, bundle.room.knockout_size)} · cặp {match.position + 1}
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {[a, b].map((item, side) => {
                      if (!item) {
                        return (
                          <div key={`bye-${side}`} className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                            Miễn đấu
                          </div>
                        );
                      }
                      const sideVotes = votes.filter((vote) => vote.item_id === item.id);
                      const won = match.winner_item_id === item.id;
                      return (
                        <div key={item.id} className={`rounded-2xl p-3 ${won ? "win-glow border-2" : "bg-white/40"}`}>
                          <div className="flex gap-3">
                            <div className="w-16 shrink-0">
                              <ZoomableItemImage
                                item={item}
                                items={[a, b].filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-bold">
                                {item.title || "Mẫu"} {won ? "✓" : ""}
                              </p>
                              <p className="text-sm text-muted-foreground">{sideVotes.length} phiếu</p>
                            </div>
                          </div>
                          {sideVotes.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {sideVotes.map((vote) => {
                                const member = memberById.get(vote.member_id);
                                if (!member) return null;
                                return (
                                  <span
                                    key={vote.id}
                                    className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/80 py-0.5 pr-2.5 pl-0.5 text-xs font-semibold"
                                  >
                                    <MemberAvatar member={member} className="size-6 text-[10px]" />
                                    <span className="truncate">{member.display_name}</span>
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-muted-foreground">Chưa có ai vote</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
        </section>

        <Link href={`/p/${slug}`} className="btn btn-ghost inline-flex min-h-11">
          Quay lại phòng
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
