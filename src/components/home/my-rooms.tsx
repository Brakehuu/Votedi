"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Copy,
  Layers,
  ListOrdered,
  Star,
  Trash2,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { myRoomsLoadError, reportError } from "@/lib/errors";
import { ensureUser } from "@/lib/storage";
import type { FormatId, RoomStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

const FORMAT_ICON: Record<FormatId, LucideIcon> = {
  quick: Zap,
  bracket: Trophy,
  schedule: CalendarDays,
  swipe: Layers,
  ranking: ListOrdered,
  rating: Star,
};

const FORMAT_NAME: Record<FormatId, string> = {
  quick: "Bình chọn nhanh",
  bracket: "Đấu loại",
  schedule: "Lịch rảnh",
  swipe: "Quẹt chọn",
  ranking: "Xếp hạng",
  rating: "Chấm điểm",
};

type MyRoomRow = {
  id: string;
  slug: string;
  name: string;
  format: FormatId;
  mode: string | null;
  status: RoomStatus;
  deadline: string | null;
  qualify_deadline: string | null;
  closed_at: string | null;
  is_host: boolean;
  joined_at: string;
  member_count: number;
  champion_title: string | null;
  champion_image_url: string | null;
  champion_emoji: string | null;
  winner_title: string | null;
  winner_image_url: string | null;
  winner_emoji: string | null;
};

type Filter = "all" | "open" | "closed" | "hosted";

function statusLabel(row: MyRoomRow) {
  if (row.status === "done" || row.status === "closed") return "Đã chốt";
  if (row.status === "lobby" || row.status === "drawn") return "Chờ bắt đầu";
  return "Đang vote";
}

function isClosed(row: MyRoomRow) {
  return row.status === "done" || row.status === "closed";
}

function winnerLabel(row: MyRoomRow) {
  return row.winner_title || row.champion_title || null;
}

function remainingText(row: MyRoomRow) {
  const raw = row.deadline || row.qualify_deadline;
  if (!raw || isClosed(row)) return null;
  const ms = Date.parse(raw) - Date.now();
  if (!Number.isFinite(ms)) return null;
  if (ms <= 0) return "Hết hạn";
  const mins = Math.ceil(ms / 60_000);
  if (mins < 60) return `Còn ${mins} phút`;
  const hours = Math.ceil(mins / 60);
  if (hours < 48) return `Còn ${hours} giờ`;
  return `Còn ${Math.ceil(hours / 24)} ngày`;
}

export function MyRooms() {
  const router = useRouter();
  const [rooms, setRooms] = useState<MyRoomRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MyRoomRow | null>(null);
  const [confirmStep, setConfirmStep] = useState(0);

  const load = useCallback(async () => {
    try {
      const { supabase } = await ensureUser();
      const { data, error: rpcError } = await supabase.rpc("list_my_rooms");
      if (rpcError) throw rpcError;
      setError(null);
      setRooms((data as MyRoomRow[]) ?? []);
    } catch (reason) {
      setError(myRoomsLoadError(reason));
      setRooms([]);
    }
  }, []);

  useEffect(() => {
    // Client RPC needs auth session — mount fetch is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- list_my_rooms after anonymous sign-in
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const list = rooms ?? [];
    if (filter === "open") return list.filter((r) => !isClosed(r));
    if (filter === "closed") return list.filter((r) => isClosed(r));
    if (filter === "hosted") return list.filter((r) => r.is_host);
    return list;
  }, [rooms, filter]);

  async function copyLink(slug: string) {
    const url = `${window.location.origin}/p/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Đã copy link");
      track("share", { via: "copy" });
    } catch {
      toast.error("Không copy được");
    }
  }

  async function duplicate(row: MyRoomRow) {
    setBusyId(row.id);
    try {
      const { supabase } = await ensureUser();
      const { data, error: rpcError } = await supabase.rpc("duplicate_room", {
        p_room_id: row.id,
      });
      if (rpcError) throw rpcError;
      toast.success("Đã nhân bản phòng");
      track("create_room", { format: row.format, via: "duplicate" });
      const slug = (data as { slug?: string } | null)?.slug;
      if (slug) router.push(`/p/${slug}`);
      else await load();
    } catch (reason) {
      toast.error(reportError(reason));
    } finally {
      setBusyId(null);
    }
  }

  async function deleteRoom(row: MyRoomRow) {
    setBusyId(row.id);
    try {
      const { supabase } = await ensureUser();
      const { data, error: rpcError } = await supabase.rpc("delete_room", {
        p_room_id: row.id,
      });
      if (rpcError) throw rpcError;
      const paths = ((data as { storage_paths?: string[] } | null)?.storage_paths ?? []).filter(Boolean);
      if (paths.length) {
        await supabase.storage.from("items").remove(paths);
      }
      toast.success("Đã xoá phòng");
      setConfirmDelete(null);
      setConfirmStep(0);
      await load();
    } catch (reason) {
      toast.error(reportError(reason));
    } finally {
      setBusyId(null);
    }
  }

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "Tất cả" },
    { id: "open", label: "Đang mở" },
    { id: "closed", label: "Đã chốt" },
    { id: "hosted", label: "Tôi tạo" },
  ];

  return (
    <main className="wrap" style={{ padding: "36px 20px 80px" }}>
      <h1 className="text-4xl font-extrabold tracking-tight">Phòng của tôi</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Phòng bạn đã tạo hoặc từng vào trên trình duyệt này.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            className={cn(
              "rounded-full border px-3.5 py-2 text-sm font-semibold",
              filter === f.id
                ? "border-primary bg-primary-soft text-primary"
                : "border-[var(--line)] bg-white text-muted-foreground",
            )}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="glass mt-6 rounded-[22px] p-4">
          <p className="text-sm text-lose">{error}</p>
          <button type="button" className="btn btn-g mt-3" onClick={() => void load()}>
            Thử lại
          </button>
        </div>
      ) : null}

      {rooms === null && !error ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-36 rounded-[22px]" />
          <Skeleton className="h-36 rounded-[22px]" />
        </div>
      ) : null}

      {rooms?.length === 0 && !error ? (
        <div className="glass mt-8 rounded-[28px] p-8 text-center">
          <p className="font-semibold">Bạn chưa vào phòng nào.</p>
          <p className="mt-1 text-sm text-muted-foreground">Tạo phòng mới và gửi link cho nhóm.</p>
          <Link href="/tao-phong" className="btn btn-primary mt-4 inline-flex">
            Tạo phòng miễn phí
          </Link>
        </div>
      ) : null}

      {rooms && rooms.length > 0 && filtered.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">Không có phòng trong bộ lọc này.</p>
      ) : null}

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {filtered.map((row) => {
          const Icon = FORMAT_ICON[row.format] ?? Zap;
          const remain = remainingText(row);
          const win = isClosed(row) ? winnerLabel(row) : null;
          return (
            <article key={row.id} className="glass flex flex-col gap-3 rounded-[22px] p-4">
              <div className="flex gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
                  <Icon className="size-6" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-muted-foreground">{FORMAT_NAME[row.format]}</p>
                  <h2 className="truncate text-lg font-extrabold tracking-tight">{row.name}</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {statusLabel(row)} · {row.member_count} người
                    {remain ? ` · ${remain}` : ""}
                  </p>
                  {row.is_host ? (
                    <span className="mt-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold">
                      Bạn là chủ phòng
                    </span>
                  ) : null}
                  {win ? (
                    <p className="mt-1 truncate text-sm font-semibold text-primary">Thắng: {win}</p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/p/${row.slug}`} className="btn btn-primary btn-sm">
                  Vào phòng
                </Link>
                <button
                  type="button"
                  className="btn btn-g btn-sm inline-flex items-center gap-1"
                  aria-label="Copy link phòng"
                  onClick={() => void copyLink(row.slug)}
                >
                  <Copy className="size-3.5" /> Link
                </button>
                {row.is_host ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-g btn-sm"
                      disabled={busyId === row.id}
                      onClick={() => void duplicate(row)}
                    >
                      Nhân bản
                    </button>
                    <button
                      type="button"
                      className="btn btn-g btn-sm inline-flex items-center gap-1 text-lose"
                      aria-label="Xoá phòng"
                      onClick={() => {
                        setConfirmDelete(row);
                        setConfirmStep(1);
                      }}
                    >
                      <Trash2 className="size-3.5" /> Xoá
                    </button>
                  </>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {confirmDelete ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="del-title"
            className="glass w-full max-w-md rounded-[24px] p-5"
          >
            <h3 id="del-title" className="text-lg font-extrabold">
              {confirmStep === 1 ? "Xoá phòng?" : "Xác nhận xoá hẳn"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {confirmStep === 1
                ? `Phòng “${confirmDelete.name}” sẽ biến mất. Ảnh trong Storage cũng bị xoá.`
                : "Không hoàn tác được. Bấm Xoá ngay để tiếp tục."}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="btn btn-g flex-1"
                onClick={() => {
                  setConfirmDelete(null);
                  setConfirmStep(0);
                }}
              >
                Huỷ
              </button>
              {confirmStep === 1 ? (
                <button type="button" className="btn btn-primary flex-1" onClick={() => setConfirmStep(2)}>
                  Tiếp tục
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary flex-1"
                  disabled={busyId === confirmDelete.id}
                  onClick={() => void deleteRoom(confirmDelete)}
                >
                  Xoá ngay
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
