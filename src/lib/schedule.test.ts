import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildIcs,
  buildSlotDrafts,
  findTripWindows,
  googleCalendarUrl,
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

  it("ranks day_parts slots with top-3 order", () => {
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
      {
        id: "c",
        room_id: "r",
        slot_date: "2026-10-11",
        part: "afternoon",
        start_time: null,
        end_time: null,
        position: 3,
      },
    ];
    const answers = new Map([
      ["a", { m1: "yes" as const, m2: "maybe" as const, m3: "no" as const }],
      ["b", { m1: "yes" as const, m2: "yes" as const, m3: "yes" as const }],
      ["c", { m1: "yes" as const, m2: "yes" as const, m3: "maybe" as const }],
    ]);
    const ranked = rankSlots(slots, answers, ["m1", "m2", "m3"]);
    assert.equal(ranked[0].slot.id, "b");
    assert.equal(ranked[0].score, 3);
    assert.equal(ranked[1].slot.id, "c");
    assert.equal(ranked[1].score, 2.5);
    assert.equal(ranked[2].score, 1.5);
  });

  it("trip 3-day window only counts people free for whole window", () => {
    const dates = ["2026-10-09", "2026-10-10", "2026-10-11", "2026-10-12", "2026-10-13"];
    const byDate = new Map([
      ["2026-10-09", { a: "yes" as const, b: "yes" as const, c: "no" as const }],
      ["2026-10-10", { a: "yes" as const, b: "yes" as const, c: "maybe" as const }],
      ["2026-10-11", { a: "yes" as const, b: "yes" as const, c: "maybe" as const }],
      ["2026-10-12", { a: "yes" as const, b: "maybe" as const, c: "yes" as const }],
      ["2026-10-13", { a: "no" as const, b: "yes" as const, c: "yes" as const }],
    ]);
    const windows = findTripWindows(dates, byDate, ["a", "b", "c"], 3);
    const w91011 = windows.find((w) => w.start === "2026-10-09");
    assert.ok(w91011);
    // a full, b full, c out (no on 9)
    assert.deepEqual(w91011!.full.sort(), ["a", "b"]);
    assert.equal(w91011!.part.length, 0);
    assert.equal(w91011!.score, 2);

    const w101112 = windows.find((w) => w.start === "2026-10-10");
    assert.ok(w101112);
    // a full; b part (maybe 12); c part (maybe 10-11)
    assert.deepEqual(w101112!.full, ["a"]);
    assert.equal(w101112!.part.length, 2);
    assert.equal(w101112!.score, 2);
  });

  it("top 3 trip windows do not overlap", () => {
    const dates = [];
    for (let d = 1; d <= 15; d++) dates.push(`2026-10-${String(d).padStart(2, "0")}`);
    const byDate = new Map(
      dates.map((d, i) => [
        d,
        {
          a: i % 2 === 0 ? ("yes" as const) : ("maybe" as const),
          b: "yes" as const,
          c: i < 10 ? ("yes" as const) : ("no" as const),
        },
      ]),
    );
    const windows = findTripWindows(dates, byDate, ["a", "b", "c"], 3);
    const top = topNonOverlapping(windows, 3);
    assert.ok(top.length <= 3);
    for (let i = 0; i < top.length; i++) {
      for (let j = i + 1; j < top.length; j++) {
        const overlap = !(top[i].start > top[j].end || top[i].end < top[j].start);
        assert.equal(overlap, false, `${top[i].start}-${top[i].end} overlaps ${top[j].start}-${top[j].end}`);
      }
    }
  });

  it("builds day_parts and trip drafts", () => {
    const drafts = buildSlotDrafts(["2026-10-10", "2026-10-11"], "day_parts", ["morning", "evening"]);
    assert.equal(drafts.length, 4);
    assert.equal(buildSlotDrafts(["2026-10-10", "2026-10-12"], "trip").length, 2);
  });

  it("builds google calendar and ics all-day range", () => {
    const url = googleCalendarUrl({ title: "Họp lớp", start: "2026-10-10", endInclusive: "2026-10-12" });
    assert.match(url, /dates=20261010%2F20261013|dates=20261010\/20261013/);
    const ics = buildIcs({ title: "Họp lớp", start: "2026-10-10", endInclusive: "2026-10-12", uid: "t@votedi.vn" });
    assert.match(ics, /DTSTART;VALUE=DATE:20261010/);
    assert.match(ics, /DTEND;VALUE=DATE:20261013/);
    assert.match(ics, /SUMMARY:Họp lớp/);
  });

  it("addDays crosses month", () => {
    assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  });
});
