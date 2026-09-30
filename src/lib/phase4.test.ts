import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeSwipeResults, countSuperlikes, remainingSwipeItems } from "@/lib/swipe";
import { computeBordaResults, rankingValuesFromOrder } from "@/lib/ranking";
import { computeRatingResults } from "@/lib/rating";
import { crossSeedSlots, splitGroups } from "@/lib/group-knockout";
import type { Item, Member, Vote } from "@/lib/types";

function item(id: string, position = 0): Item {
  return {
    id,
    room_id: "r",
    title: id,
    image_url: null,
    is_transparent: false,
    item_type: "text",
    description: null,
    price_text: null,
    emoji: null,
    place: null,
    link: null,
    position,
    created_at: `2026-01-0${position + 1}T00:00:00Z`,
    uploader_member_id: null,
  };
}

function vote(item_id: string, member_id: string, value: number): Vote {
  return {
    id: `${item_id}-${member_id}`,
    room_id: "r",
    item_id,
    member_id,
    value,
    created_at: "2026-01-01T00:00:00Z",
  };
}

function member(id: string): Member {
  return {
    id,
    room_id: "r",
    user_id: id,
    display_name: id,
    avatar_url: null,
    avatar_emoji: "🙂",
    is_host: false,
    kicked_at: null,
    joined_at: "2026-01-01T00:00:00Z",
  };
}

describe("swipe scoring", () => {
  it("scores like=1 super=2 and flags match-all", () => {
    const items = [item("a"), item("b")];
    const members = [member("m1"), member("m2")];
    const votes = [
      vote("a", "m1", 2),
      vote("a", "m2", 1),
      vote("b", "m1", 0),
      vote("b", "m2", 1),
    ];
    const rows = computeSwipeResults(items, votes, members);
    assert.equal(rows[0]!.item.id, "a");
    assert.equal(rows[0]!.score, 3);
    assert.equal(rows[0]!.matchAll, true);
    assert.equal(rows[1]!.matchAll, false);
    assert.equal(countSuperlikes(votes, "m1"), 1);
    assert.equal(remainingSwipeItems(items, votes, "m1").length, 0);
  });
});

describe("borda ranking", () => {
  it("awards N..1 and average rank", () => {
    const items = [item("a"), item("b"), item("c")];
    const votes = [
      vote("a", "m1", 3),
      vote("b", "m1", 2),
      vote("c", "m1", 1),
      vote("b", "m2", 3),
      vote("a", "m2", 2),
      vote("c", "m2", 1),
    ];
    const rows = computeBordaResults(items, votes);
    assert.equal(rows[0]!.score, 5);
    assert.equal(rows[1]!.score, 5);
    assert.equal(rows[2]!.item.id, "c");
    assert.equal(rows[2]!.score, 2);
    const vals = rankingValuesFromOrder(["x", "y", "z"]);
    assert.equal(vals.get("x"), 3);
    assert.equal(vals.get("z"), 1);
  });
});

describe("rating with judges", () => {
  it("blends judge and audience weights", () => {
    const items = [item("a")];
    const votes = [vote("a", "j1", 5), vote("a", "a1", 3), vote("a", "a2", 1)];
    const rows = computeRatingResults(items, votes, new Set(["j1"]), 0.5);
    assert.equal(rows[0]!.score, 3.5);
    assert.equal(rows[0]!.judgeScore, 5);
    assert.equal(rows[0]!.audienceScore, 2);
  });
});

describe("group knockout", () => {
  it("splits groups of 4 and cross-seeds", () => {
    const items = Array.from({ length: 8 }, (_, i) => item(`i${i}`, i));
    const groups = splitGroups(items);
    assert.equal(groups.length, 2);
    assert.equal(groups[0]!.label, "A");
    assert.equal(groups[1]!.items.length, 4);
    const slots = crossSeedSlots([
      ["1A", "2A"],
      ["1B", "2B"],
    ]);
    assert.deepEqual(slots, ["1A", "2B", "1B", "2A"]);
  });
});
