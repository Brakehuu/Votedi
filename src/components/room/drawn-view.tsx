"use client";

import { useState } from "react";
import { BracketBoard } from "@/components/bracket/bracket-board";
import { ItemGridCard } from "@/components/room/item-grid-card";
import { ItemUploader } from "@/components/room/item-uploader";
import { useRoom } from "@/components/room/room-context";
import { Button } from "@/components/ui/button";
import { seedNumbersFromMatches, slotsFromMatches, swapSlots } from "@/lib/seeding";

function seedingHint(mode: string | null, seeding: string) {
  if (mode === "group_knockout") return "Xếp chéo nhất/nhì các bảng.";
  if (mode === "qualify_knockout") return "Xếp theo thứ hạng vòng loại.";
  if (seeding === "manual") return "Chạm 2 mẫu trên sơ đồ để đổi chỗ.";
  return "Mẫu được xếp nhánh ngẫu nhiên, thêm hay xóa mẫu sẽ tự xếp lại.";
}

export function DrawnView() {
  const {
    bundle,
    me,
    startKnockout,
    removeItem,
    renameItem,
    refresh,
    shuffleBracket,
    setBracket,
  } = useRoom();
  const canUpload = me.is_host || bundle.room.allow_member_upload;
  const isKnockout = bundle.room.mode === "knockout";
  const seeding = bundle.room.seeding_mode ?? "random";
  const count = bundle.items.length;
  const ready = isKnockout ? count >= 2 && count <= 16 : bundle.matches.length > 0;
  const showSeeds =
    bundle.room.mode === "qualify_knockout" || bundle.room.mode === "group_knockout";
  const canEditSlots = me.is_host && seeding === "manual" && ready;
  const canShuffle = me.is_host && isKnockout && seeding === "random" && ready;

  const [busy, setBusy] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const seedByItem = showSeeds
    ? seedNumbersFromMatches(bundle.matches, bundle.room.knockout_size)
    : undefined;

  async function start() {
    setBusy(true);
    try {
      await startKnockout();
    } finally {
      setBusy(false);
    }
  }

  async function shuffle() {
    setBusy(true);
    try {
      await shuffleBracket();
    } finally {
      setBusy(false);
    }
  }

  async function onSlotActivate(slotIndex: number) {
    if (!canEditSlots) return;
    if (selectedSlot === null) {
      setSelectedSlot(slotIndex);
      return;
    }
    if (selectedSlot === slotIndex) {
      setSelectedSlot(null);
      return;
    }
    const slots = slotsFromMatches(bundle.matches, bundle.room.knockout_size);
    const next = swapSlots(slots, selectedSlot, slotIndex);
    setSelectedSlot(null);
    setBusy(true);
    try {
      await setBracket(next);
    } finally {
      setBusy(false);
    }
  }

  async function onSlotDrop(from: number, to: number) {
    if (!canEditSlots || from === to) return;
    const slots = slotsFromMatches(bundle.matches, bundle.room.knockout_size);
    const next = swapSlots(slots, from, to);
    setSelectedSlot(null);
    setBusy(true);
    try {
      await setBracket(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 pb-28">
      {isKnockout ? (
        <section className="space-y-3">
          <h2 className="room-h">
            Mẫu · {count}
            <small>Tối đa 16 mẫu</small>
          </h2>
          {canUpload ? (
            <ItemUploader
              roomId={bundle.room.id}
              currentCount={count}
              maxItems={16}
              onDone={refresh}
            />
          ) : (
            <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">Chủ phòng chưa cho thành viên tải mẫu.</p>
          )}
          {count === 0 ? (
            <div className="rounded-[22px] border border-dashed border-border p-8 text-center text-muted-foreground">
              Chưa có mẫu nào. Tải ảnh để xếp nhánh.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {bundle.items.map((item) => (
                <ItemGridCard
                  key={item.id}
                  item={item}
                  items={bundle.items}
                  canDelete={me.is_host || item.uploader_member_id === me.id}
                  canRename={me.is_host}
                  onDelete={removeItem}
                  onRename={renameItem}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <div className="glass rounded-[22px] p-4">
          <h2 className="text-xl font-extrabold tracking-tight">Sơ đồ nhánh</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {seedingHint(bundle.room.mode, seeding)}
            {me.is_host ? "" : " Chờ chủ phòng bắt đầu đấu."}
          </p>
        </div>
      )}

      <section className="space-y-3">
        {isKnockout ? (
          <p className="text-sm text-muted-foreground">{seedingHint(bundle.room.mode, seeding)}</p>
        ) : null}
        {canEditSlots && selectedSlot !== null ? (
          <div className="flex items-center justify-between gap-2 rounded-2xl bg-primary-soft px-3 py-2">
            <p className="text-sm font-semibold">Đã chọn ô — chạm ô khác để đổi chỗ</p>
            <Button type="button" variant="outline" size="sm" onClick={() => setSelectedSlot(null)}>
              Hủy
            </Button>
          </div>
        ) : null}
        {bundle.matches.length > 0 ? (
          <div className="ko-board-shell glass rounded-[28px] p-3">
            <BracketBoard
              size={bundle.room.knockout_size}
              matches={bundle.matches}
              items={bundle.items}
              members={bundle.members}
              matchVotes={bundle.matchVotes}
              meId={me.id}
              preview
              seedByItem={seedByItem}
              showSeeds={showSeeds}
              slotEdit={
                canEditSlots
                  ? {
                      selectedSlot,
                      onSlotActivate,
                      onSlotDrop,
                    }
                  : undefined
              }
            />
          </div>
        ) : (
          <p className="rounded-[22px] border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Cần ít nhất 2 mẫu để hiện sơ đồ nhánh.
          </p>
        )}
      </section>

      {me.is_host ? (
        <div className="glass fixed inset-x-3 bottom-3 z-30 flex gap-2 rounded-full p-2 lg:static lg:bg-transparent lg:p-0 lg:shadow-none">
          {canShuffle ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-12 shrink-0 px-4"
              disabled={busy || !ready}
              onClick={() => void shuffle()}
            >
              Xáo lại
            </Button>
          ) : null}
          <Button
            type="button"
            className="min-h-12 flex-1"
            disabled={busy || !ready}
            onClick={() => void start()}
          >
            {busy ? "Đang mở..." : "Bắt đầu đấu"}
          </Button>
        </div>
      ) : (
        <p className="rounded-[22px] bg-primary-soft p-4 text-sm">Chờ chủ phòng bắt đầu đấu.</p>
      )}
    </div>
  );
}
