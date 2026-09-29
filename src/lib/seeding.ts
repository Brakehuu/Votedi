import { matchesInRound, nextPow2 } from "@/lib/bracket";
import type { Match } from "@/lib/types";

/** Classic bracket seed order for power-of-2 size (1-indexed). */
export function standardSeedOrder(size: number): number[] {
  let seeds = [1];
  let r = 0;
  while (2 ** r < size) {
    r += 1;
    const lim = 2 ** r;
    const next: number[] = [];
    for (const s of seeds) {
      next.push(s, lim + 1 - s);
    }
    seeds = next;
  }
  return seeds;
}

/** Map itemId → seed number from round-1 slot order. */
export function seedNumbersFromMatches(matches: Match[], size: number): Record<string, number> {
  const bracket = nextPow2(Math.max(2, size));
  const order = standardSeedOrder(bracket);
  const slots: (string | null)[] = Array.from({ length: bracket }, () => null);
  const r1 = matches
    .filter((match) => match.round === 1)
    .sort((a, b) => a.position - b.position);
  for (const match of r1) {
    const base = match.position * 2;
    if (base < bracket) slots[base] = match.item_a;
    if (base + 1 < bracket) slots[base + 1] = match.item_b;
  }
  const map: Record<string, number> = {};
  for (let i = 0; i < bracket; i += 1) {
    const id = slots[i];
    const seed = order[i];
    if (id && seed) map[id] = seed;
  }
  return map;
}

export function slotsFromMatches(matches: Match[], size: number): (string | null)[] {
  const bracket = nextPow2(Math.max(2, size));
  const slots: (string | null)[] = Array.from({ length: bracket }, () => null);
  const r1 = matches
    .filter((match) => match.round === 1)
    .sort((a, b) => a.position - b.position);
  const expected = matchesInRound(bracket, 1);
  for (let p = 0; p < expected; p += 1) {
    const match = r1.find((row) => row.position === p);
    slots[p * 2] = match?.item_a ?? null;
    slots[p * 2 + 1] = match?.item_b ?? null;
  }
  return slots;
}

export function swapSlots(slots: (string | null)[], a: number, b: number) {
  const next = [...slots];
  const tmp = next[a] ?? null;
  next[a] = next[b] ?? null;
  next[b] = tmp;
  return next;
}
