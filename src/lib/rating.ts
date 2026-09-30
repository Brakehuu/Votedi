import type { Item, Vote } from "@/lib/types";

function avg(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export type RatingRow = {
  item: Item;
  score: number;
  votes: number;
  judgeScore: number | null;
  audienceScore: number | null;
};

export function computeRatingResults(
  items: Item[],
  votes: Vote[],
  judgeIds: Set<string>,
  judgeWeight: number,
): RatingRow[] {
  const hasJudges = judgeIds.size > 0;
  return items
    .map((item) => {
      const all = votes.filter((v) => v.item_id === item.id).map((v) => Number(v.value));
      const judgeVals = votes
        .filter((v) => v.item_id === item.id && judgeIds.has(v.member_id))
        .map((v) => Number(v.value));
      const audVals = votes
        .filter((v) => v.item_id === item.id && !judgeIds.has(v.member_id))
        .map((v) => Number(v.value));
      const judgeScore = hasJudges ? avg(judgeVals) : null;
      const audienceScore = hasJudges ? avg(audVals) : null;
      const score = hasJudges
        ? (judgeScore ?? 0) * judgeWeight + (audienceScore ?? 0) * (1 - judgeWeight)
        : avg(all);
      return {
        item,
        score: Math.round(score * 10) / 10,
        votes: all.length,
        judgeScore: judgeScore != null ? Math.round(judgeScore * 10) / 10 : null,
        audienceScore: audienceScore != null ? Math.round(audienceScore * 10) / 10 : null,
      };
    })
    .sort((a, b) => b.score - a.score || b.votes - a.votes);
}
