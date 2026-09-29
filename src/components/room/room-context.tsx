"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { toast } from "sonner";
import { ServerClockContext } from "@/components/room/countdown";
import { reportError } from "@/lib/errors";
import { roundLabel } from "@/lib/bracket";
import { fetchRoomBundle } from "@/lib/room-data";
import { createClient } from "@/lib/supabase/client";
import type { Match, MatchVote, Member, QualifyVote, RoomBundle, RoomStatus, Vote } from "@/lib/types";

type RoomContextValue = {
  bundle: RoomBundle;
  me: Member;
  onlineIds: Set<string>;
  offline: boolean;
  advance: (hostStart?: boolean) => Promise<void>;
  drawBracket: () => Promise<void>;
  startKnockout: () => Promise<void>;
  shuffleBracket: () => Promise<void>;
  setSeedingMode: (mode: "random" | "manual") => Promise<void>;
  setBracket: (itemIds: (string | null)[]) => Promise<void>;
  toggleQualify: (itemId: string) => Promise<void>;
  voteMatch: (matchId: string, itemId: string) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  renameItem: (itemId: string, title: string) => Promise<void>;
  kickMember: (memberId: string) => Promise<void>;
  setLocked: (locked: boolean) => Promise<void>;
  setPassword: (password: string | null) => Promise<boolean>;
  setMemberUpload: (allow: boolean) => Promise<void>;
  setMemberOptions: (allow: boolean) => Promise<void>;
  reopenRoom: () => Promise<void>;
  addOptions: (payload: unknown[]) => Promise<boolean>;
  removeOption: (itemId: string) => Promise<void>;
  extendDeadline: (minutes: 5 | 15) => Promise<void>;
  endRound: () => Promise<void>;
  castVote: (itemId: string) => Promise<void>;
  removeVote: (itemId: string) => Promise<void>;
  clearMyVotes: () => Promise<void>;
  closeIfDue: () => Promise<void>;
  closeRoom: () => Promise<void>;
  refresh: () => Promise<void>;
};

const RoomContext = createContext<RoomContextValue | null>(null);

export function useRoom() {
  const value = useContext(RoomContext);
  if (!value) throw new Error("Room");
  return value;
}

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}
const readOnline = () => navigator.onLine;
const readOnlineServer = () => true;

function vibrateSoft() {
  try {
    navigator.vibrate?.(10);
  } catch {
    /* ignore */
  }
}

export function RoomProvider({
  initial,
  me,
  children,
}: {
  initial: RoomBundle;
  me: Member;
  children: React.ReactNode;
}) {
  const [bundle, setBundle] = useState(initial);
  const [serverSnapshot, setServerSnapshot] = useState(initial);
  if (serverSnapshot !== initial) {
    setServerSnapshot(initial);
    setBundle(initial);
  }
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set([me.id]));
  const online = useSyncExternalStore(subscribeOnline, readOnline, readOnlineServer);
  const offline = !online;
  const pause = useRef(0);
  const requestId = useRef(0);
  const statusRef = useRef<RoomStatus>(initial.room.status);
  const matchesRef = useRef<Match[]>(initial.matches);
  const supabase = useMemo(() => createClient(), []);

  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    const next = await fetchRoomBundle(supabase, initial.room.id);
    if (!next || id !== requestId.current || pause.current > 0) return;
    if (statusRef.current !== next.room.status) {
      if (next.room.status === "qualify") toast.message("Vòng loại đã bắt đầu");
      if (next.room.status === "drawn" && statusRef.current === "qualify") {
        toast.message("Đã xếp nhánh theo thứ hạng");
      }
      if (next.room.status === "knockout") toast.message("Knockout bắt đầu — vào vote đi!");
      if (next.room.status === "done") toast.success("Đã có mẫu vô địch!");
      if (next.room.status === "closed") toast.success("Nhóm đã chốt kết quả!");
      statusRef.current = next.room.status;
    }
    for (const match of next.matches) {
      const prev = matchesRef.current.find((row) => row.id === match.id);
      if (prev && prev.status !== "done" && match.status === "done" && match.winner_item_id) {
        const winner = next.items.find((item) => item.id === match.winner_item_id);
        const label = roundLabel(match.round, next.room.knockout_size);
        const pairNo = label === "Chung kết" ? "" : ` ${match.position + 1}`;
        toast.success(`${winner?.title || "Mẫu"} thắng ${label}${pairNo}`);
      }
    }
    matchesRef.current = next.matches;
    setBundle(next);
  }, [initial.room.id, supabase]);

  const advance = useCallback(
    async (hostStart = false) => {
      const { error } = await supabase.rpc("advance_room", {
        p_room_id: initial.room.id,
        p_host_start: hostStart,
      });
      if (error && hostStart) toast.error(reportError(error));
      await refresh();
    },
    [initial.room.id, refresh, supabase],
  );

  const closeIfDue = useCallback(async () => {
    const { error } = await supabase.rpc("close_room_if_due", { p_room_id: initial.room.id });
    if (error) console.error("[Vote Đi] close_room_if_due", error);
    await refresh();
  }, [initial.room.id, refresh, supabase]);

  const closeRoom = useCallback(async () => {
    const { error } = await supabase.rpc("close_room", { p_room_id: initial.room.id });
    if (error) {
      toast.error(reportError(error));
      return;
    }
    toast.success("Đã chốt kết quả");
    await refresh();
  }, [initial.room.id, refresh, supabase]);

  const reopenRoom = useCallback(async () => {
    const { error } = await supabase.rpc("reopen_room", { p_room_id: initial.room.id });
    if (error) {
      toast.error(reportError(error));
      return;
    }
    toast.success("Đã mở lại vote");
    await refresh();
  }, [initial.room.id, refresh, supabase]);

  const setMemberOptions = useCallback(
    async (allow: boolean) => {
      const { error } = await supabase.rpc("host_set_member_options", {
        p_room_id: initial.room.id,
        p_allow: allow,
      });
      if (error) {
        toast.error(reportError(error));
        return;
      }
      toast.success(allow ? "Thành viên được thêm lựa chọn" : "Chỉ chủ phòng thêm lựa chọn");
      await refresh();
    },
    [initial.room.id, refresh, supabase],
  );

  const addOptions = useCallback(
    async (payload: unknown[]) => {
      const { error } = await supabase.rpc("add_options", {
        p_room_id: initial.room.id,
        p_options: payload,
      });
      if (error) {
        toast.error(reportError(error));
        return false;
      }
      toast.success("Đã thêm lựa chọn");
      await refresh();
      return true;
    },
    [initial.room.id, refresh, supabase],
  );

  const removeOption = useCallback(
    async (itemId: string) => {
      const { data, error } = await supabase.rpc("remove_option", { p_item_id: itemId });
      if (error) {
        toast.error(reportError(error));
        return;
      }
      if (typeof data === "string" && data) {
        const removed = await supabase.storage.from("items").remove([data]);
        if (removed.error) console.error("[Vote Đi] storage remove", removed.error);
      }
      toast.success("Đã xoá lựa chọn");
      await refresh();
    },
    [refresh, supabase],
  );

  const isBracket = initial.room.format === "bracket";
  const settle = isBracket ? advance : closeIfDue;

  const drawBracket = useCallback(async () => {
    const { error } = await supabase.rpc("draw_bracket", { p_room_id: initial.room.id });
    if (error) {
      toast.error(reportError(error));
      return;
    }
    toast.success("Đã xếp lại nhánh");
    await refresh();
  }, [initial.room.id, refresh, supabase]);

  const startKnockout = useCallback(async () => {
    const { error } = await supabase.rpc("start_knockout", { p_room_id: initial.room.id });
    if (error) {
      toast.error(reportError(error));
      return;
    }
    await refresh();
  }, [initial.room.id, refresh, supabase]);

  const shuffleBracket = useCallback(async () => {
    const { error } = await supabase.rpc("host_shuffle_bracket", { p_room_id: initial.room.id });
    if (error) {
      toast.error(reportError(error));
      return;
    }
    await refresh();
  }, [initial.room.id, refresh, supabase]);

  const setSeedingMode = useCallback(
    async (mode: "random" | "manual") => {
      const { error } = await supabase.rpc("host_set_seeding_mode", {
        p_room_id: initial.room.id,
        p_mode: mode,
      });
      if (error) {
        toast.error(reportError(error));
        return;
      }
      toast.success(mode === "manual" ? "Chủ phòng tự xếp nhánh" : "Xếp nhánh ngẫu nhiên");
      await refresh();
    },
    [initial.room.id, refresh, supabase],
  );

  const setBracket = useCallback(
    async (itemIds: (string | null)[]) => {
      const { error } = await supabase.rpc("host_set_bracket", {
        p_room_id: initial.room.id,
        p_item_ids: itemIds,
      });
      if (error) {
        toast.error(reportError(error));
        return;
      }
      await refresh();
    },
    [initial.room.id, refresh, supabase],
  );

  useEffect(() => {
    void settle();
    const onFocus = () => void refresh();
    const onOnline = () => void refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);

    let timer: number | undefined;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void refresh(), 200);
    };

    const byRoom = `room_id=eq.${initial.room.id}`;
    let channel = supabase
      .channel(`room-${initial.room.id}`, {
        config: { presence: { key: me.id } },
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${initial.room.id}` }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "members", filter: byRoom }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "items", filter: byRoom }, schedule);
    channel = isBracket
      ? channel
          .on("postgres_changes", { event: "*", schema: "public", table: "qualify_votes", filter: byRoom }, schedule)
          .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: byRoom }, schedule)
          .on("postgres_changes", { event: "*", schema: "public", table: "match_votes" }, schedule)
      : channel.on("postgres_changes", { event: "*", schema: "public", table: "votes", filter: byRoom }, schedule);
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ member_id: string }>();
        const ids = new Set<string>();
        for (const rows of Object.values(state)) {
          for (const row of rows) {
            if (row.member_id) ids.add(row.member_id);
          }
        }
        setOnlineIds(ids);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ member_id: me.id, name: me.display_name });
        }
      });

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [initial.room.id, isBracket, me.display_name, me.id, refresh, settle, supabase]);

  const toggleQualify = useCallback(
    async (itemId: string) => {
      const mine = bundle.qualifyVotes.filter((vote) => vote.member_id === me.id);
      const existing = mine.find((vote) => vote.item_id === itemId);
      pause.current += 1;
      const previous = bundle.qualifyVotes;
      if (existing) {
        setBundle((current) => ({
          ...current,
          qualifyVotes: current.qualifyVotes.filter((vote) => vote.id !== existing.id),
        }));
        const { error } = await supabase.rpc("remove_qualify_vote", { p_item_id: itemId });
        pause.current -= 1;
        if (error) {
          setBundle((current) => ({ ...current, qualifyVotes: previous }));
          toast.error(reportError(error));
          return;
        }
        toast.success("Đã bỏ chọn");
      } else {
        if (mine.length >= bundle.room.votes_per_member) {
          pause.current -= 1;
          toast.error("Hết phiếu, bỏ chọn một mẫu để đổi");
          return;
        }
        const optimistic: QualifyVote = {
          id: `tmp-${itemId}`,
          room_id: bundle.room.id,
          item_id: itemId,
          member_id: me.id,
        };
        setBundle((current) => ({ ...current, qualifyVotes: [...current.qualifyVotes, optimistic] }));
        const { error } = await supabase.rpc("cast_qualify_vote", { p_item_id: itemId });
        pause.current -= 1;
        if (error) {
          setBundle((current) => ({ ...current, qualifyVotes: previous }));
          toast.error(reportError(error));
          return;
        }
        vibrateSoft();
        const title = bundle.items.find((item) => item.id === itemId)?.title || "mẫu";
        toast.success(`Đã chọn ${title}`);
      }
      await advance(false);
    },
    [advance, bundle, me.id, supabase],
  );

  const voteMatch = useCallback(
    async (matchId: string, itemId: string) => {
      const previous = bundle.matchVotes;
      const optimistic: MatchVote = {
        id: `tmp-${matchId}`,
        match_id: matchId,
        member_id: me.id,
        item_id: itemId,
      };
      pause.current += 1;
      setBundle((current) => ({
        ...current,
        matchVotes: [
          ...current.matchVotes.filter((vote) => !(vote.match_id === matchId && vote.member_id === me.id)),
          optimistic,
        ],
      }));
      const { error } = await supabase.rpc("cast_match_vote", {
        p_match_id: matchId,
        p_item_id: itemId,
      });
      pause.current -= 1;
      if (error) {
        setBundle((current) => ({ ...current, matchVotes: previous }));
        toast.error(reportError(error));
        return;
      }
      vibrateSoft();
      const title = bundle.items.find((item) => item.id === itemId)?.title || "mẫu";
      toast.success(`Đã chọn ${title}`);
      await advance(false);
    },
    [advance, bundle.items, bundle.matchVotes, me.id, supabase],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      const { data, error } = await supabase.rpc("host_delete_item", { p_item_id: itemId });
      if (error) {
        toast.error(reportError(error));
        return;
      }
      if (typeof data === "string" && data) {
        const removed = await supabase.storage.from("items").remove([data]);
        if (removed.error) console.error("[Vote Đi] storage remove", removed.error);
      }
      toast.success("Đã xóa mẫu");
      await refresh();
    },
    [refresh, supabase],
  );

  const renameItem = useCallback(
    async (itemId: string, title: string) => {
      const { error } = await supabase.rpc("host_rename_item", { p_item_id: itemId, p_title: title });
      if (error) {
        toast.error(reportError(error));
        return;
      }
      await refresh();
    },
    [refresh, supabase],
  );

  const kickMember = useCallback(
    async (memberId: string) => {
      const { error } = await supabase.rpc("host_kick_member", { p_member_id: memberId });
      if (error) {
        toast.error(reportError(error));
        return;
      }
      toast.success("Đã mời thành viên ra");
      await refresh();
    },
    [refresh, supabase],
  );

  const setLocked = useCallback(
    async (locked: boolean) => {
      const { error } = await supabase.rpc("host_set_locked", {
        p_room_id: initial.room.id,
        p_locked: locked,
      });
      if (error) {
        toast.error(reportError(error));
        return;
      }
      toast.success(locked ? "Đã khóa phòng" : "Đã mở khóa phòng");
      await refresh();
    },
    [initial.room.id, refresh, supabase],
  );

  const setPassword = useCallback(
    async (password: string | null) => {
      const { error } = await supabase.rpc("host_set_password", {
        p_room_id: initial.room.id,
        p_password: password,
      });
      if (error) {
        toast.error(reportError(error));
        return false;
      }
      toast.success(password ? "Đã đặt mật khẩu phòng" : "Đã bỏ mật khẩu phòng");
      await refresh();
      return true;
    },
    [initial.room.id, refresh, supabase],
  );

  const setMemberUpload = useCallback(
    async (allow: boolean) => {
      const { error } = await supabase.rpc("host_set_member_upload", {
        p_room_id: initial.room.id,
        p_allow: allow,
      });
      if (error) {
        toast.error(reportError(error));
        return;
      }
      toast.success(allow ? "Thành viên được tải mẫu" : "Chỉ chủ phòng tải mẫu");
      await refresh();
    },
    [initial.room.id, refresh, supabase],
  );

  const extendDeadline = useCallback(
    async (minutes: 5 | 15) => {
      const { error } = await supabase.rpc("host_extend_deadline", {
        p_room_id: initial.room.id,
        p_minutes: minutes,
      });
      if (error) {
        toast.error(reportError(error));
        return;
      }
      toast.success(`Đã gia hạn +${minutes} phút`);
      await refresh();
    },
    [initial.room.id, refresh, supabase],
  );

  const endRound = useCallback(async () => {
    const { error } = await supabase.rpc("host_end_round", { p_room_id: initial.room.id });
    if (error) {
      toast.error(reportError(error));
      return;
    }
    toast.success("Đã kết thúc vòng hiện tại");
    await refresh();
  }, [initial.room.id, refresh, supabase]);

  const writeVotes = useCallback(
    async (next: (votes: Vote[]) => Vote[], run: () => PromiseLike<{ error: unknown }>) => {
      const previous = bundle.votes;
      pause.current += 1;
      setBundle((current) => ({ ...current, votes: next(current.votes) }));
      const { error } = await run();
      pause.current -= 1;
      if (error) {
        setBundle((current) => ({ ...current, votes: previous }));
        toast.error(reportError(error));
        await closeIfDue();
        return false;
      }
      return true;
    },
    [bundle.votes, closeIfDue],
  );

  const castVote = useCallback(
    async (itemId: string) => {
      const max = Math.max(1, bundle.room.settings.max_choices ?? 1);
      const mine = bundle.votes.filter((vote) => vote.member_id === me.id);
      if (mine.some((vote) => vote.item_id === itemId)) return;
      if (max > 1 && mine.length >= max) {
        toast.error(`Bạn chỉ chọn được tối đa ${max}. Bỏ chọn một lựa chọn để đổi.`);
        return;
      }
      const optimistic: Vote = {
        id: `tmp-${itemId}`,
        room_id: bundle.room.id,
        item_id: itemId,
        member_id: me.id,
        value: 1,
        created_at: new Date().toISOString(),
      };
      const ok = await writeVotes(
        (votes) => [...(max === 1 ? votes.filter((vote) => vote.member_id !== me.id) : votes), optimistic],
        () => supabase.rpc("cast_vote", { p_item_id: itemId, p_value: 1 }),
      );
      if (!ok) return;
      vibrateSoft();
      const title = bundle.items.find((item) => item.id === itemId)?.title || "lựa chọn";
      toast.success(`Đã chọn ${title}`);
      await closeIfDue();
    },
    [bundle.items, bundle.room.id, bundle.room.settings.max_choices, bundle.votes, closeIfDue, me.id, supabase, writeVotes],
  );

  const removeVote = useCallback(
    async (itemId: string) => {
      const ok = await writeVotes(
        (votes) => votes.filter((vote) => !(vote.member_id === me.id && vote.item_id === itemId)),
        () => supabase.rpc("remove_vote", { p_item_id: itemId }),
      );
      if (!ok) return;
      toast.success("Đã bỏ chọn");
      await closeIfDue();
    },
    [closeIfDue, me.id, supabase, writeVotes],
  );

  const clearMyVotes = useCallback(async () => {
    const ok = await writeVotes(
      (votes) => votes.filter((vote) => vote.member_id !== me.id),
      () => supabase.rpc("clear_my_votes", { p_room_id: initial.room.id }),
    );
    if (!ok) return;
    toast.success("Đã bỏ chọn hết");
    await closeIfDue();
  }, [closeIfDue, initial.room.id, me.id, supabase, writeVotes]);

  const value = useMemo(
    () => ({
      bundle,
      me,
      onlineIds,
      offline,
      advance,
      drawBracket,
      startKnockout,
      shuffleBracket,
      setSeedingMode,
      setBracket,
      toggleQualify,
      voteMatch,
      removeItem,
      renameItem,
      kickMember,
      setLocked,
      setPassword,
      setMemberUpload,
      setMemberOptions,
      reopenRoom,
      addOptions,
      removeOption,
      extendDeadline,
      endRound,
      castVote,
      removeVote,
      clearMyVotes,
      closeIfDue,
      closeRoom,
      refresh,
    }),
    [
      addOptions,
      advance,
      bundle,
      castVote,
      clearMyVotes,
      closeIfDue,
      closeRoom,
      drawBracket,
      endRound,
      extendDeadline,
      kickMember,
      me,
      offline,
      onlineIds,
      refresh,
      removeItem,
      removeOption,
      removeVote,
      renameItem,
      reopenRoom,
      setBracket,
      setLocked,
      setPassword,
      setMemberOptions,
      setMemberUpload,
      setSeedingMode,
      shuffleBracket,
      startKnockout,
      toggleQualify,
      voteMatch,
    ],
  );

  return (
    <ServerClockContext.Provider value={initial.serverNow}>
      <RoomContext.Provider value={value}>{children}</RoomContext.Provider>
    </ServerClockContext.Provider>
  );
}
