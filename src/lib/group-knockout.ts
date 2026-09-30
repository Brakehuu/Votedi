import type { Item } from "@/lib/types";

export type GroupBucket = {
  label: string;
  items: Item[];
};

/** Split items into groups of 4 (A, B, C…) by position. */
export function splitGroups(items: Item[]): GroupBucket[] {
  const sorted = [...items].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0) || a.created_at.localeCompare(b.created_at),
  );
  const out: GroupBucket[] = [];
  for (let i = 0; i < sorted.length; i += 4) {
    out.push({
      label: String.fromCharCode(65 + out.length),
      items: sorted.slice(i, i + 4),
    });
  }
  return out;
}

/**
 * World-cup style cross seed slots: [1A, 2B, 1B, 2A, …]
 * Each group entry is [winner, runnerUp].
 */
export function crossSeedSlots(groupPairs: [string, string][]): (string | null)[] {
  const slots: (string | null)[] = [];
  for (let i = 0; i < groupPairs.length; i += 2) {
    const a = groupPairs[i]!;
    const b = groupPairs[i + 1];
    if (b) {
      slots.push(a[0], b[1], b[0], a[1]);
    } else {
      slots.push(a[0], a[1]);
    }
  }
  let size = 2;
  while (size < slots.length) size *= 2;
  while (slots.length < size) slots.push(null);
  return slots;
}
