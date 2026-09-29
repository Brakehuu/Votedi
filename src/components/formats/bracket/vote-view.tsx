"use client";

import { DrawnView } from "@/components/room/drawn-view";
import { KnockoutView } from "@/components/room/knockout-view";
import { LobbyView } from "@/components/room/lobby-view";
import { QualifyView } from "@/components/room/qualify-view";
import { useRoom } from "@/components/room/room-context";

export function BracketVoteView() {
  const { bundle } = useRoom();
  const status = bundle.room.status;
  return (
    <>
      {status === "lobby" ? <LobbyView /> : null}
      {status === "drawn" ? <DrawnView /> : null}
      {status === "qualify" ? <QualifyView /> : null}
      {status === "knockout" || status === "done" ? <KnockoutView /> : null}
    </>
  );
}
