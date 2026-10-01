"use client";

import { useState } from "react";
import { BracketBoard } from "@/components/bracket/bracket-board";
import { ItemGridCard } from "@/components/room/item-grid-card";
import { ItemUploader } from "@/components/room/item-uploader";
import { MemberAvatar } from "@/components/room/member-avatar";
import { useRoom } from "@/components/room/room-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { seedNumbersFromMatches, slotsFromMatches, swapSlots } from "@/lib/seeding";

function seedingHint(mode: string | null, seeding: string) {
  if (mode === "group_knockout") return "Nhất và nhì mỗi bảng vào sơ đồ, xếp chéo.";
  if (mode === "qualify_knockout") return "Xếp theo thứ hạng vòng loại.";
  if (seeding === "manual") return "Chạm 2 mẫu trên sơ đồ để đổi chỗ.";
  return "Mẫu được xếp nhánh ngẫu nhiên, thêm hay xóa mẫu sẽ tự xếp lại.";
}

export function LobbyView() {
  const {
    bundle,
    me,
    onlineIds,
    advance,
    removeItem,
    renameItem,
    refresh,
    startKnockout,
    shuffleBracket,
    setBracket,
  } = useRoom();
  const [open, setOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const canUpload = me.is_host || bundle.room.allow_member_upload;
  const count = bundle.items.length;
  const isKnockout = bundle.room.mode === "knockout";
  const isGroup = bundle.room.mode === "group_knockout";
  const seeding = bundle.room.seeding_mode ?? "random";
  const ready = isKnockout
    ? count >= 2 && count <= 16
    : isGroup
      ? count >= 8 && count <= 32
      : count >= Math.max(2, bundle.room.knockout_size) && count <= 32;
  const canEditSlots = me.is_host && isKnockout && seeding === "manual" && ready;
  const canShuffle = me.is_host && isKnockout && seeding === "random" && ready;

  async function confirmQualify() {
    setStarting(true);
    try {
      await advance(true);
    } finally {
      setStarting(false);
      setOpen(false);
    }
  }

  async function startKo() {
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
    <div className="space-y-6 pb-28">
      <section className="space-y-3">
        <h2 className="room-h">
          Thành viên · {bundle.members.length}
          <small>{onlineIds.size} đang online</small>
        </h2>
        {bundle.members.length === 0 ? (
          <p className="rounded-[22px] border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {bundle.room.has_password
              ? bundle.room.has_password
                ? "Chưa có ai vào. Gửi link và mật khẩu cho nhóm bạn."
                : "Chưa có ai vào. Gửi link cho nhóm bạn."
              : "Chưa có ai vào. Gửi link mời cho nhóm bạn."}
          </p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {bundle.members.map((member) => (
              <div key={member.id} className="relative flex w-16 shrink-0 flex-col items-center gap-1 text-center">
                <MemberAvatar member={member} className="size-12 text-xl" />
                {onlineIds.has(member.id) ? (
                  <span className="absolute top-0 right-1 size-3 rounded-full bg-[#22C55E] ring-2 ring-white" aria-label="Online" />
                ) : null}
                <span className="w-full truncate text-xs font-medium">{member.display_name}</span>
                {member.is_host ? <span className="text-[10px] font-semibold text-primary">Chủ phòng</span> : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="room-h">
          Mẫu · {count}
          <small>{isKnockout ? "Cần 2–16 mẫu" : `Tối thiểu ${Math.max(2, bundle.room.knockout_size)} mẫu`}</small>
        </h2>
        {canUpload ? (
          <ItemUploader
            roomId={bundle.room.id}
            currentCount={count}
            maxItems={isKnockout ? 16 : 32}
            onDone={refresh}
          />
        ) : (
          <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">Chủ phòng chưa cho thành viên tải mẫu.</p>
        )}
        {count === 0 ? (
          <div className="rounded-[22px] border border-dashed border-border p-8 text-center text-muted-foreground">
            Chưa có mẫu nào. Tải ảnh JPG/PNG/WEBP lên để bắt đầu.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {bundle.items.map((item, index) => (
                <ItemGridCard
                  key={item.id}
                  item={item}
                  items={bundle.items}
                  index={index}
                  canDelete={me.is_host || item.uploader_member_id === me.id}
                  canRename={me.is_host}
                  onDelete={removeItem}
                  onRename={renameItem}
                />
            ))}
          </div>
        )}
      </section>

      {isKnockout ? (
        <section className="space-y-3">
          <p className="text-sm text-muted-foreground">{seedingHint(bundle.room.mode, seeding)}</p>
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
                seedByItem={seedNumbersFromMatches(bundle.matches, bundle.room.knockout_size)}
                showSeeds={false}
                slotEdit={
                  canEditSlots
                    ? { selectedSlot, onSlotActivate, onSlotDrop }
                    : undefined
                }
              />
            </div>
          ) : (
            <p className="rounded-[22px] border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Tải từ 2 mẫu trở lên — sơ đồ xếp ngay bên dưới.
            </p>
          )}
        </section>
      ) : null}

      {isKnockout && me.is_host ? (
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
            disabled={!ready || busy}
            onClick={() => void startKo()}
          >
            {busy ? "Đang mở..." : "Bắt đầu đấu"}
          </Button>
        </div>
      ) : null}

      {!isKnockout && me.is_host ? (
        <div className="glass fixed inset-x-3 bottom-3 z-30 rounded-full p-2 lg:static lg:bg-transparent lg:p-0 lg:shadow-none">
          <Button type="button" className="min-h-12 w-full" disabled={!ready || starting} onClick={() => setOpen(true)}>
            Bắt đầu vòng loại
          </Button>
          {!ready ? (
            <p className="mt-2 text-center text-xs text-muted-foreground">Cần đủ số mẫu tối thiểu.</p>
          ) : null}
        </div>
      ) : null}

      {!isKnockout && !me.is_host ? (
        <p className="rounded-[22px] bg-primary-soft p-4 text-sm">Chờ chủ phòng bắt đầu.</p>
      ) : null}

      {isKnockout && !me.is_host ? (
        <p className="rounded-[22px] bg-primary-soft p-4 text-sm">Chờ chủ phòng bắt đầu đấu.</p>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Bắt đầu vòng loại?</DialogTitle>
          <DialogDescription>
            Mọi người vote vòng loại. Hết giờ sẽ xếp top mẫu vào nhánh theo thứ hạng.
          </DialogDescription>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setOpen(false)}>
              Để sau
            </Button>
            <Button type="button" className="min-h-11" disabled={starting} onClick={() => void confirmQualify()}>
              {starting ? "Đang mở..." : "Bắt đầu"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
