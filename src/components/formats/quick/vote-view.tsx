"use client";

import { useMemo, useState } from "react";
import { Check, Clock3, ExternalLink, Map as MapIcon, Navigation, Plus } from "lucide-react";
import { OptionCard, OptionMedia, optionTitle, PlaceVoteCard } from "@/components/options/option-card";
import { PlaceMapEmbed, directionsUrl } from "@/components/options/place-map";
import { PlacesMapOverview } from "@/components/options/places-map-overview";
import { OptionEditor, type OptionDraft } from "@/components/formats/quick/option-editor";
import { Countdown } from "@/components/room/countdown";
import { ImageLightbox } from "@/components/room/image-lightbox";
import { ReactionBar } from "@/components/room/reaction-bar";
import { useRoom } from "@/components/room/room-context";
import { VoterStack } from "@/components/room/voter-stack";
import { ZoomIcon } from "@/components/icons/zoom-icon";
import { FORMATS } from "@/lib/formats";
import { uploadPublicImage } from "@/lib/storage";
import type { Member } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const format = FORMATS.quick;

export function QuickVoteView() {
  const { bundle, me, castVote, removeVote, clearMyVotes, closeIfDue, addOptions, updateOption, toggleReaction } = useRoom();
  const { room } = bundle;
  const max = Math.max(1, room.settings.max_choices ?? 1);
  const closed = room.status === "closed";
  const placeMode = room.settings.option_kind === "place";
  const canAdd = !closed && (me.is_host || room.allow_member_options);
  const [lbId, setLbId] = useState<string | null>(null);
  const [tab, setTab] = useState<"vote" | "map">("vote");
  const [mapOpen, setMapOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [drafts, setDrafts] = useState<OptionDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [refetchingId, setRefetchingId] = useState<string | null>(null);

  const rows = useMemo(() => format.computeResults!(bundle.items, bundle.votes), [bundle.items, bundle.votes]);
  const memberById = useMemo(() => new Map(bundle.members.map((member) => [member.id, member])), [bundle.members]);
  const mine = useMemo(
    () => new Set(bundle.votes.filter((vote) => vote.member_id === me.id).map((vote) => vote.item_id)),
    [bundle.votes, me.id],
  );
  const votedPeople = new Set(bundle.votes.map((vote) => vote.member_id)).size;
  const maxScore = Math.max(1, ...rows.map((row) => row.score));
  const lead = rows[0]?.score ?? 0;
  const tiedLead = lead > 0 && rows[1]?.score === lead;
  const winnerId = closed ? (room.result?.winner_item_id ?? room.champion_item_id) : null;
  const winnerRow = winnerId ? rows.find((row) => row.item.id === winnerId) : undefined;
  const imageItems = useMemo(
    () => rows.map((row) => row.item).filter((item) => item.item_type === "image" && item.image_url),
    [rows],
  );
  const placeCount = useMemo(
    () => bundle.items.filter((item) => item.item_type === "place" && item.place?.lat != null && item.place?.lng != null).length,
    [bundle.items],
  );
  const ranks = useMemo(() => new Map(rows.map((row, index) => [row.item.id, index + 1])), [rows]);
  const left = Math.max(0, max - mine.size);

  async function refetchPlace(itemId: string) {
    const item = bundle.items.find((row) => row.id === itemId);
    const mapsUrl = item?.place?.maps_url;
    if (!mapsUrl || !me.is_host) return;
    setRefetchingId(itemId);
    try {
      const res = await fetch("/api/places/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: mapsUrl }),
      });
      const data = (await res.json()) as {
        name?: string | null;
        lat?: number | null;
        lng?: number | null;
        mapsUrl?: string;
      };
      const title =
        data.name?.trim() ||
        (item.title && item.title !== "Địa điểm chưa rõ tên" ? item.title : null) ||
        "Địa điểm chưa rõ tên";
      await updateOption(itemId, {
        title,
        place: {
          ...(item.place ?? {}),
          name: data.name ?? item.place?.name ?? null,
          lat: data.lat ?? null,
          lng: data.lng ?? null,
          maps_url: data.mapsUrl ?? mapsUrl,
        },
      });
      toast.success(data.lat != null ? "Đã cập nhật vị trí" : "Vẫn chưa lấy được toạ độ — giữ link Maps");
    } catch {
      toast.error("Không lấy lại được vị trí");
    } finally {
      setRefetchingId(null);
    }
  }

  function onPick(itemId: string) {
    if (closed) return;
    void (mine.has(itemId) ? removeVote(itemId) : castVote(itemId));
  }

  async function saveDrafts() {
    if (drafts.length === 0) return;
    setSaving(true);
    try {
      const payload = [];
      for (const row of drafts) {
        if (row.type === "image" && row.file) {
          const { prepareItemImage } = await import("@/lib/images");
          const prepared = await prepareItemImage(row.file);
          const path = `${room.id}/${crypto.randomUUID()}.webp`;
          const url = await uploadPublicImage(path, prepared.blob, prepared.contentType);
          payload.push({
            item_type: "image",
            title: row.title.trim() || "Ảnh",
            image_url: url,
            is_transparent: prepared.transparent,
          });
        } else if (row.type === "place") {
          payload.push({
            item_type: "place",
            title: row.title.trim(),
            price_text: row.price_text ?? null,
            description: row.description ?? null,
            place: {
              name: row.place?.name ?? row.title.trim(),
              address: row.place?.address ?? null,
              lat: row.place?.lat ?? null,
              lng: row.place?.lng ?? null,
              maps_url: row.place?.maps_url ?? null,
              booking_url: row.place?.booking_url ?? null,
              note: row.place?.note ?? null,
            },
          });
        } else if (row.type === "link" && row.link) {
          let imageUrl: string | null = null;
          if (row.imageBlob) {
            const ext = row.imageContentType?.includes("png")
              ? "png"
              : row.imageContentType?.includes("webp")
                ? "webp"
                : "jpg";
            const path = `${room.id}/${crypto.randomUUID()}.${ext}`;
            imageUrl = await uploadPublicImage(path, row.imageBlob, row.imageContentType ?? "image/jpeg");
          }
          payload.push({
            item_type: "link",
            title: row.title.trim(),
            price_text: row.price_text ?? null,
            link: {
              url: row.link.url,
              title: row.title.trim(),
              site_name: row.link.site_name ?? null,
              image_url: imageUrl,
            },
          });
        } else {
          payload.push({ item_type: "text", title: row.title.trim(), emoji: row.emoji });
        }
      }
      const ok = await addOptions(payload);
      if (ok) {
        for (const row of drafts) {
          if (row.preview) URL.revokeObjectURL(row.preview);
        }
        setDrafts([]);
        setAdding(false);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ql">
      <section className="ql-sum glass">
        <div className="ql-sum-top">
          <span className="ql-stage">
            <format.icon aria-hidden size={15} />
            {format.name}
          </span>
          {closed ? (
            <span className="ql-stage">Đã chốt</span>
          ) : room.deadline ? (
            <span className="ko-timer">
              <Clock3 aria-hidden size={15} />
              <Countdown deadline={room.deadline} onDone={() => void closeIfDue()} />
            </span>
          ) : null}
        </div>
        <h1>{closed ? "Nhóm đã chốt!" : format.hint(room.settings)}</h1>
        <p>
          {room.description ||
            (closed
              ? "Kết quả cuối cùng bên dưới."
              : room.deadline
                ? "Đổi ý thoải mái đến khi hết giờ."
                : "Đổi ý thoải mái đến khi chủ phòng chốt.")}
        </p>
        {winnerRow ? (
          <div className="qk-win">
            <OptionCard option={winnerRow.item} badge="#1" selected showMap />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary">Lựa chọn thắng</p>
              <p className="mt-1 text-2xl font-extrabold tracking-tight break-words">{optionTitle(winnerRow.item)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {winnerRow.votes} phiếu{room.result?.tied ? " · hòa, đã xử lý theo luật hòa" : ""}
              </p>
              {winnerRow.item.item_type === "place" &&
              winnerRow.item.place?.lat != null &&
              winnerRow.item.place?.lng != null ? (
                <a
                  className="btn btn-primary mt-3 inline-flex min-h-11"
                  href={directionsUrl(winnerRow.item.place.lat, winnerRow.item.place.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Navigation aria-hidden size={16} />
                  Chỉ đường
                </a>
              ) : null}
              {winnerRow.item.item_type === "link" && winnerRow.item.link?.url ? (
                <a
                  className="btn btn-primary mt-3 inline-flex min-h-11"
                  href={winnerRow.item.link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink aria-hidden size={16} />
                  Mở link
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
        <div className="ql-stats">
          <div className="ql-stat">
            <small>Lựa chọn</small>
            <b>{bundle.items.length}</b>
          </div>
          <div className="ql-stat">
            <small>Đã vote</small>
            <b>
              {votedPeople}/{bundle.members.length}
            </b>
          </div>
          <div className="ql-stat">
            <small>Bạn</small>
            <b>{mine.size > 0 ? "Đã vote" : "Chưa vote"}</b>
          </div>
        </div>
      </section>

      <div className="ql-tools">
        <h2>{closed ? "Kết quả" : placeMode ? "Địa điểm" : "Bảng xếp hạng"}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {tiedLead && !closed ? <span className="ql-stage">Đang hòa</span> : null}
          {(placeMode || placeCount >= 2) && (
            <div className="ql-seg" role="tablist" aria-label="Chế độ xem">
              <button type="button" role="tab" aria-selected={tab === "vote"} className={cn(tab === "vote" && "on")} onClick={() => setTab("vote")}>
                Vote
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "map"}
                className={cn(tab === "map" && "on")}
                onClick={() => {
                  setTab("map");
                  setMapOpen(true);
                }}
              >
                <MapIcon aria-hidden size={14} />
                Bản đồ
              </button>
            </div>
          )}
        </div>
      </div>

      {placeMode && tab === "vote" ? (
        <section className="place-grid" aria-live="polite">
          {rows.map((row, index) => {
            const selected = mine.has(row.item.id);
            const voters = row.voterIds
              .map((id) => memberById.get(id))
              .filter((member): member is Member => Boolean(member));
            return (
              <PlaceVoteCard
                key={row.item.id}
                option={{ ...row.item, place: row.item.place }}
                rank={index + 1}
                selected={selected}
                closed={closed}
                onPick={() => onPick(row.item.id)}
                onRefetch={me.is_host ? () => void refetchPlace(row.item.id) : undefined}
                refetching={refetchingId === row.item.id}
                voters={
                  voters.length > 0 ? (
                    <div className="ql-voters mt-2">
                      <VoterStack members={voters} />
                      <span className="text-xs text-muted-foreground">{row.votes} phiếu</span>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">{row.votes} phiếu</p>
                  )
                }
              />
            );
          })}
        </section>
      ) : null}

      {(!placeMode || tab !== "vote") && tab === "vote" ? (
      <section className="ql-board glass" aria-live="polite">
        {rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Phòng chưa có lựa chọn nào.</p>
        ) : (
          rows.map((row, index) => {
            const { item } = row;
            const selected = mine.has(item.id);
            const title = optionTitle(item);
            const voters = row.voterIds
              .map((id) => memberById.get(id))
              .filter((member): member is Member => Boolean(member));
            const isImage = item.item_type === "image" && Boolean(item.image_url);
            const lat = item.place?.lat;
            const lng = item.place?.lng;
            return (
              <div
                key={item.id}
                className={cn("ql-row in", index === 0 && row.score > 0 && "top1", selected && "mine")}
              >
                <div className="ql-rank">{index + 1}</div>
                {isImage ? (
                  <button type="button" className="ql-thumb" aria-label={`Xem to ${title}`} onClick={() => setLbId(item.id)}>
                    <OptionMedia option={item} />
                    <span className="ql-zoom" aria-hidden>
                      <ZoomIcon />
                    </span>
                  </button>
                ) : (
                  <span className="ql-thumb cursor-default">
                    <OptionMedia option={item} size="sm" />
                  </span>
                )}
                <div className="ql-info">
                  <b>{title}</b>
                  {item.place?.address ? (
                    <span className="block truncate text-xs text-muted-foreground">{item.place.address}</span>
                  ) : item.description ? (
                    <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
                  ) : item.link?.site_name ? (
                    <span className="block truncate text-xs text-muted-foreground">{item.link.site_name}</span>
                  ) : null}
                  {item.price_text ? <span className="opt-price">{item.price_text}</span> : null}
                  <div className="ql-meta">
                    <div className="ql-pbar">
                      <i style={{ width: `${(row.score / maxScore) * 100}%` }} />
                    </div>
                    <span className="ql-cnt">{row.votes} phiếu</span>
                  </div>
                  {voters.length > 0 && !room.anonymous ? (
                    <div className="ql-voters">
                      <VoterStack members={voters} />
                    </div>
                  ) : room.anonymous && row.votes > 0 ? (
                    <p className="text-xs text-muted-foreground">{row.votes} người đã chọn</p>
                  ) : null}
                  {room.reactions_enabled ? (
                    <ReactionBar
                      counts={Object.fromEntries(
                        ["❤️", "😍", "🔥", "😂", "👎"].map((e) => [
                          e,
                          bundle.reactions.filter((r) => r.item_id === item.id && r.emoji === e).length,
                        ]),
                      )}
                      mine={new Set(bundle.reactions.filter((r) => r.item_id === item.id && r.member_id === me.id).map((r) => r.emoji))}
                      anonymous={room.anonymous}
                      onToggle={(emoji) => void toggleReaction(item.id, emoji)}
                    />
                  ) : null}
                  {item.item_type === "place" && lat != null && lng != null ? (
                    <div className="ql-place-acts">
                      <a href={directionsUrl(lat, lng)} target="_blank" rel="noopener noreferrer">
                        Chỉ đường
                      </a>
                      {item.place?.maps_url ? (
                        <a href={item.place.maps_url} target="_blank" rel="noopener noreferrer">
                          Maps
                        </a>
                      ) : null}
                      <PlaceMapEmbed lat={lat} lng={lng} title={title} className="place-map place-map-sm" />
                    </div>
                  ) : null}
                  {item.item_type === "link" && item.link?.url ? (
                    <a className="ql-link-out" href={item.link.url} target="_blank" rel="noopener noreferrer">
                      Mở link
                    </a>
                  ) : null}
                </div>
                {closed ? (
                  <span />
                ) : (
                  <button
                    type="button"
                    className={cn("ql-pick", selected && "on", !selected && max > 1 && left <= 0 && "dim")}
                    aria-label={selected ? `Bỏ chọn ${title}` : `Chọn ${title}`}
                    aria-pressed={selected}
                    onClick={() => onPick(item.id)}
                  >
                    {selected ? <Check aria-hidden /> : <Plus aria-hidden />}
                    <span className="t">{selected ? "Đã chọn" : "Chọn"}</span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </section>
      ) : null}

      {canAdd ? (
        <section className="glass mt-3 rounded-[22px] p-4">
          {adding ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold">{placeMode ? "Thêm địa điểm" : "Thêm lựa chọn"}</h3>
                <button
                  type="button"
                  className="text-sm font-semibold text-muted-foreground"
                  onClick={() => {
                    setAdding(false);
                    setDrafts([]);
                  }}
                >
                  Huỷ
                </button>
              </div>
              <OptionEditor
                value={drafts}
                max={Math.max(0, format.maxOptions - bundle.items.length)}
                onChange={setDrafts}
                placeMode={placeMode}
              />
              <button
                type="button"
                className="btn btn-primary min-h-11 w-full"
                disabled={saving || drafts.length === 0 || drafts.some((row) => !row.title.trim())}
                onClick={() => void saveDrafts()}
              >
                {saving ? "Đang lưu…" : `Lưu ${drafts.length} lựa chọn`}
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-dark min-h-11 w-full gap-2" onClick={() => setAdding(true)}>
              <Plus aria-hidden size={18} />
              Thêm lựa chọn
            </button>
          )}
        </section>
      ) : null}

      {!closed ? (
        <div className="ql-dock glass">
          {max > 1 ? (
            <div className="ql-pips" aria-hidden>
              {Array.from({ length: max }, (_, i) => (
                <i key={i} className={i < mine.size ? "used" : undefined} />
              ))}
            </div>
          ) : null}
          <div className="ql-dock-txt">
            <b>
              {mine.size === 0
                ? "Bạn chưa vote"
                : max > 1
                  ? left > 0
                    ? `Bạn còn ${left} lựa chọn`
                    : "Bạn đã chọn đủ"
                  : "Bạn đã vote"}
            </b>
            <span>{max > 1 ? `Mỗi người chọn tối đa ${max}` : "Chạm lựa chọn khác để đổi"}</span>
          </div>
          {mine.size > 0 ? (
            <button type="button" className="btn btn-dark min-h-11 shrink-0" onClick={() => void clearMyVotes()}>
              Bỏ chọn hết
            </button>
          ) : null}
        </div>
      ) : null}

      <ImageLightbox
        open={Boolean(lbId)}
        startId={lbId ?? ""}
        items={imageItems}
        onClose={() => setLbId(null)}
        chosenId={lbId && mine.has(lbId) ? lbId : null}
        canVote={!closed && Boolean(lbId)}
        onVote={onPick}
        voteCounts={Object.fromEntries(rows.map((row) => [row.item.id, row.votes]))}
        keepOpen
        selectedIds={mine}
      />

      <PlacesMapOverview
        items={bundle.items}
        ranks={ranks}
        open={mapOpen || tab === "map"}
        onClose={() => {
          setMapOpen(false);
          setTab("vote");
        }}
      />
    </div>
  );
}
