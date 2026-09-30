import type { Item, Vote } from "@/lib/types";

export type BordaRow = {
  item: Item;
  score: number;
  avgRank: number | null;
  votes: number;
};

/** Borda: rank 1 → N points, last → 1. Vote.value is already N..1. */
export function computeBordaResults(items: Item[], votes: Vote[]): BordaRow[] {
  const n = items.length;
  const byItem = items.map((item) => {
    const mine = votes.filter((v) => v.item_id === item.id);
    const score = mine.reduce((s, v) => s + Number(v.value), 0);
    const avgRank =
      mine.length > 0
        ? mine.reduce((s, v) => s + (n - Number(v.value) + 1), 0) / mine.length
        : null;
    return { item, score, avgRank, votes: mine.length };
  });
  return byItem.sort(
    (a, b) =>
      b.score - a.score ||
      (a.avgRank ?? 99) - (b.avgRank ?? 99) ||
      (a.item.position ?? 0) - (b.item.position ?? 0),
  );
}

/** Convert ordered item ids (index 0 = rank 1) to Borda values N..1. */
export function rankingValuesFromOrder(itemIds: string[]): Map<string, number> {
  const n = itemIds.length;
  const map = new Map<string, number>();
  itemIds.forEach((id, index) => map.set(id, n - index));
  return map;
}
