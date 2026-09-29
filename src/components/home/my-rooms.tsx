"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ItemImage } from "@/components/room/item-image";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/errors";
import { ensureUser } from "@/lib/storage";
import type { RoomStatus } from "@/lib/types";

const STATUS: Record<RoomStatus, string> = {
  lobby: "Chờ",
  qualify: "Vòng loại",
  drawn: "Đã xếp nhánh",
  knockout: "Knockout",
  done: "Đã chốt",
};

type RoomCard = {
  id: string;
  slug: string;
  name: string;
  status: RoomStatus;
  isHost: boolean;
  imageUrl: string | null;
  transparent: boolean;
};

export function MyRooms() {
  const [rooms, setRooms] = useState<RoomCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    ensureUser()
      .then(async ({ supabase, user }) => {
        const { data, error: queryError } = await supabase
          .from("members")
          .select("is_host, joined_at, rooms(id, slug, name, status, champion_item_id)")
          .eq("user_id", user.id)
          .order("joined_at", { ascending: false });
        if (queryError) throw queryError;
        const rows = (data ?? []) as unknown as {
          is_host: boolean;
          rooms: {
            id: string;
            slug: string;
            name: string;
            status: RoomStatus;
            champion_item_id: string | null;
          } | null;
        }[];
        const championIds = rows
          .map((row) => row.rooms?.champion_item_id)
          .filter((id): id is string => Boolean(id));
        const images = new Map<string, { url: string; transparent: boolean }>();
        if (championIds.length) {
          const { data: items } = await supabase
            .from("items")
            .select("id, image_url, is_transparent")
            .in("id", championIds);
          for (const item of items ?? []) {
            images.set(item.id, { url: item.image_url, transparent: item.is_transparent });
          }
        }
        if (cancelled) return;
        setRooms(
          rows
            .filter((row) => row.rooms)
            .map((row) => {
              const room = row.rooms!;
              const image = room.champion_item_id ? images.get(room.champion_item_id) : undefined;
              return {
                id: room.id,
                slug: room.slug,
                name: room.name,
                status: room.status,
                isHost: row.is_host,
                imageUrl: image?.url ?? null,
                transparent: image?.transparent ?? false,
              };
            }),
        );
      })
      .catch((reason: Error) => {
        if (!cancelled) setError(errorMessage(reason));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="wrap" style={{ padding: "36px 20px 80px" }}>
      <h1 className="text-4xl font-extrabold tracking-tight">Phòng của tôi</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Những phòng bạn đã tạo hoặc từng vào trên trình duyệt này.
      </p>
      {error ? <p className="mt-6 text-sm text-lose">{error}</p> : null}
      {rooms === null && !error ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : null}
      {rooms?.length === 0 ? (
        <div className="glass mt-8 rounded-[28px] p-8 text-center">
          <p>Bạn chưa vào phòng nào.</p>
          <Link href="/tao-phong" className="btn btn-primary mt-4">
            Tạo phòng miễn phí
          </Link>
        </div>
      ) : null}
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {rooms?.map((room) => (
          <Link key={room.id} href={`/p/${room.slug}`} className="glass flex items-center gap-4 rounded-[22px] p-4">
            {room.imageUrl ? (
              <div className="w-20 shrink-0">
                <ItemImage src={room.imageUrl} alt="" transparent={room.transparent} />
              </div>
            ) : (
              <div className="grid size-20 shrink-0 place-items-center rounded-2xl bg-primary-soft text-2xl">🏆</div>
            )}
            <div className="min-w-0">
              <p className="truncate text-lg font-extrabold tracking-tight">{room.name}</p>
              <p className="text-sm text-muted-foreground">
                {STATUS[room.status]}
                {room.isHost ? " · Chủ phòng" : ""}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
