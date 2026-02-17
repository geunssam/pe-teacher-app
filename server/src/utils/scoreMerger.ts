/**
 * Merge rule-based score, AI confidence, and personal bonus into a total score.
 *
 * @param ruleScore - Score from rule-based recommendation engine (0~100)
 * @param aiConfidence - AI confidence from Gemini (0.0~1.0)
 * @param personalBonus - Personal history bonus (0~100)
 * @returns Merged total score (0~100)
 */
export function mergeScores(
  ruleScore: number,
  aiConfidence: number,
  personalBonus: number,
): number {
  const total =
    ruleScore * 0.7 + aiConfidence * 100 * 0.2 + personalBonus * 0.1;
  return Math.round(Math.min(100, Math.max(0, total)));
}
