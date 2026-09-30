import type { Item, Member, Vote } from "@/lib/types";

export type SwipeValue = 0 | 1 | 2;

export function swipeLabel(value: SwipeValue) {
  if (value === 2) return "Rất thích";
  if (value === 1) return "Thích";
  return "Bỏ qua";
}

export function countSuperlikes(votes: Vote[], memberId: string) {
  return votes.filter((v) => v.member_id === memberId && Number(v.value) === 2).length;
}

export function mySwipeMap(votes: Vote[], memberId: string) {
  const map = new Map<string, SwipeValue>();
  for (const v of votes) {
    if (v.member_id === memberId) map.set(v.item_id, Number(v.value) as SwipeValue);
  }
  return map;
}

export type SwipeRow = {
  item: Item;
  score: number;
  likes: number;
  supers: number;
  skips: number;
  voterIds: string[];
  matchAll: boolean;
};

/** Score = sum(value); matchAll = every member gave like or superlike. */
export function computeSwipeResults(items: Item[], votes: Vote[], members: Member[]): SwipeRow[] {
  const active = members.filter((m) => !m.kicked_at);
  const byItem = new Map<string, SwipeRow>(
    items.map((item) => [
      item.id,
      { item, score: 0, likes: 0, supers: 0, skips: 0, voterIds: [], matchAll: false },
    ]),
  );
  for (const vote of votes) {
    const row = byItem.get(vote.item_id);
    if (!row) continue;
    const value = Number(vote.value);
    row.score += value;
    row.voterIds.push(vote.member_id);
    if (value === 2) row.supers += 1;
    else if (value === 1) row.likes += 1;
    else row.skips += 1;
  }
  for (const row of byItem.values()) {
    if (active.length === 0) {
      row.matchAll = false;
      continue;
    }
    const liked = new Set(
      votes
        .filter((v) => v.item_id === row.item.id && Number(v.value) >= 1)
        .map((v) => v.member_id),
    );
    row.matchAll = active.every((m) => liked.has(m.id));
  }
  return [...byItem.values()].sort(
    (a, b) =>
      b.score - a.score ||
      Number(b.matchAll) - Number(a.matchAll) ||
      (a.item.position ?? 0) - (b.item.position ?? 0),
  );
}

export function remainingSwipeItems(items: Item[], votes: Vote[], memberId: string) {
  const done = mySwipeMap(votes, memberId);
  return items.filter((item) => !done.has(item.id));
}
