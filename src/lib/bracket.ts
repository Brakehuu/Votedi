export function nextPow2(n: number) {
  if (n <= 2) return 2;
  if (n <= 4) return 4;
  if (n <= 8) return 8;
  return 16;
}

export function roundCount(size: number) {
  return Math.round(Math.log2(Math.max(2, size)));
}

export function matchesInRound(size: number, round: number) {
  return Math.max(1, size / 2 ** round);
}

/** Tên vòng: Vòng 1/16, Tứ kết, Bán kết, Chung kết */
export function roundLabel(round: number, size: number) {
  const players = size / 2 ** (round - 1);
  if (players <= 2) return "Chung kết";
  if (players === 4) return "Bán kết";
  if (players === 8) return "Tứ kết";
  return `Vòng 1/${players}`;
}

/** Viết tắt cho placeholder "Thắng TK1" */
export function roundAbbr(round: number, size: number) {
  const players = size / 2 ** (round - 1);
  if (players <= 2) return "CK";
  if (players === 4) return "BK";
  if (players === 8) return "TK";
  return `V${players}`;
}

export function formatRemaining(ms: number) {
  if (ms <= 0) return "00:00";
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (days > 0) return `${days} ngày ${hours} giờ`;
  if (hours > 0) return `${hours} giờ ${String(minutes).padStart(2, "0")} phút`;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Các vòng theo kích thước sơ đồ (1..final). */
export function roundList(size: number) {
  const total = roundCount(size);
  return Array.from({ length: total }, (_, index) => index + 1);
}

/** Nửa trái / phải của một vòng (không gồm chung kết). */
export function halfPositions(size: number, round: number, half: "left" | "right") {
  const count = matchesInRound(size, round);
  if (count <= 1) return [0];
  const halfCount = count / 2;
  if (half === "left") return Array.from({ length: halfCount }, (_, i) => i);
  return Array.from({ length: halfCount }, (_, i) => i + halfCount);
}

/** Cặp nguồn nuôi vị trí trống (pending). */
export function feederMatch(size: number, round: number, position: number, side: "a" | "b") {
  if (round <= 1) return null;
  const prevRound = round - 1;
  const prevCount = matchesInRound(size, prevRound);
  if (prevCount <= 1) return null;
  // Parent position maps from two children: pos*2 and pos*2+1 in same half layout
  const childPos = position * 2 + (side === "a" ? 0 : 1);
  if (childPos >= prevCount) return null;
  return { round: prevRound, position: childPos };
}

export function matchKey(round: number, position: number) {
  return `${round}:${position}`;
}

/** Hạng 3 từ thua bán kết (hoặc hạng 3 vòng loại). Shared server+client — không đặt trong "use client". */
export function deriveThirdPlace<T extends { id: string }>({
  items,
  matches,
  knockoutSize,
  championId,
  runnerUpId,
  qualifyRankIds,
}: {
  items: T[];
  matches: {
    round: number;
    status: string;
    winner_item_id: string | null;
    item_a: string | null;
    item_b: string | null;
  }[];
  knockoutSize: number;
  championId?: string | null;
  runnerUpId?: string | null;
  qualifyRankIds?: string[];
}): T | undefined {
  if (qualifyRankIds?.length) {
    const thirdId = qualifyRankIds.find((id) => id !== championId && id !== runnerUpId);
    if (thirdId) return items.find((i) => i.id === thirdId);
  }
  const finalRound = roundCount(knockoutSize);
  const semiRound = finalRound - 1;
  if (semiRound < 1) return undefined;
  const semis = matches.filter((m) => m.round === semiRound && m.status === "done" && m.winner_item_id);
  const losers = semis
    .map((m) => (m.winner_item_id === m.item_a ? m.item_b : m.item_a))
    .filter((id): id is string => Boolean(id) && id !== championId && id !== runnerUpId);
  if (losers[0]) return items.find((i) => i.id === losers[0]);
  return undefined;
}
