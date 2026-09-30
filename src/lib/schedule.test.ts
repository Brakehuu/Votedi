import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildSlotDrafts,
  findTripWindows,
  rankSlots,
  topNonOverlapping,
  answerScore,
  addDays,
} from "@/lib/schedule";
import type { ScheduleSlot } from "@/lib/types";

describe("schedule scoring", () => {
  it("scores yes=1 maybe=0.5", () => {
    assert.equal(answerScore("yes"), 1);
    assert.equal(answerScore("maybe"), 0.5);
    assert.equal(answerScore("no"), 0);
    assert.equal(answerScore(undefined), 0);
  });

  it("ranks day_parts slots", () => {
    const slots: ScheduleSlot[] = [
      {
        id: "a",
        room_id: "r",
        slot_date: "2026-10-10",
        part: "morning",
        start_time: null,
        end_time: null,
        position: 1,
      },
      {
        id: "b",
        room_id: "r",
        slot_date: "2026-10-10",
        part: "evening",
        start_time: null,
        end_time: null,
        position: 2,
      },
    ];
    const answers = new Map([
      ["a", { m1: "yes" as const, m2: "maybe" as const, m3: "no" as const }],
      ["b", { m1: "yes" as const, m2: "yes" as const, m3: "yes" as const }],
    ]);
    const ranked = rankSlots(slots, answers, ["m1", "m2", "m3"]);
    assert.equal(ranked[0].slot.id, "b");
    assert.equal(ranked[0].score, 3);
    assert.equal(ranked[1].score, 1.5);
  });

  it("finds best trip window of 3 days", () => {
    const dates = ["2026-10-09", "2026-10-10", "2026-10-11", "2026-10-12", "2026-10-13"];
    const byDate = new Map([
      ["2026-10-09", { a: "yes" as const, b: "yes" as const, c: "no" as const }],
      ["2026-10-10", { a: "yes" as const, b: "yes" as const, c: "maybe" as const }],
      ["2026-10-11", { a: "yes" as const, b: "yes" as const, c: "maybe" as const }],
      ["2026-10-12", { a: "yes" as const, b: "maybe" as const, c: "yes" as const }],
      ["2026-10-13", { a: "no" as const, b: "yes" as const, c: "yes" as const }],
    ]);
    const windows = findTripWindows(dates, byDate, ["a", "b", "c"], 3);
    assert.ok(windows.length >= 1);
    // 10–12: a full, b part (maybe on 12), c part (maybe on 10-11) → score 1+0.5+0.5 = 2
    // 9–11: a full, b full, c out → score 2
    const top = windows[0];
    assert.equal(top.full.length + top.part.length >= 2, true);
    assert.equal(top.end, addDays(top.start, 2));
    const nonOverlap = topNonOverlapping(windows, 3);
    assert.ok(nonOverlap.length >= 1);
    assert.ok(nonOverlap.length <= 3);
  });

  it("builds day_parts drafts", () => {
    const drafts = buildSlotDrafts(["2026-10-10", "2026-10-11"], "day_parts", ["morning", "evening"]);
    assert.equal(drafts.length, 4);
    assert.equal(drafts[0].part, "morning");
  });

  it("builds trip drafts as one slot per day", () => {
    const drafts = buildSlotDrafts(["2026-10-10", "2026-10-12"], "trip");
    assert.equal(drafts.length, 2);
    assert.equal(drafts[0].part, null);
  });
});
