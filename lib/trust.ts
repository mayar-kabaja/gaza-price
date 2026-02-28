import { TrustLevel } from "@/types/app";
import { TRUST_SCORE_WEIGHTS, TRUST_SCORE_MAX, TRUST_THRESHOLDS } from "./constants";

export function calculateTrustScore({
  confirmations,
  hasReceipt,
  reporterTrustLevel,
}: {
  confirmations: number;
  hasReceipt: boolean;
  reporterTrustLevel: TrustLevel;
}): number {
  const multiplier = TRUST_SCORE_WEIGHTS[`${reporterTrustLevel}_contributor`];
  const base =
    confirmations * TRUST_SCORE_WEIGHTS.confirmation +
    (hasReceipt ? TRUST_SCORE_WEIGHTS.receipt : 0);
  return Math.min(Math.round(base * multiplier), TRUST_SCORE_MAX);
}

export function getTrustLevelFromReports(reportCount: number): TrustLevel {
  if (reportCount >= TRUST_THRESHOLDS.verified.min) return "verified";
  if (reportCount >= TRUST_THRESHOLDS.trusted.min) return "trusted";
  if (reportCount >= TRUST_THRESHOLDS.regular.min) return "regular";
  return "new";
}

export function getNextTrustLevel(current: TrustLevel): TrustLevel | null {
  const levels: TrustLevel[] = ["new", "regular", "trusted", "verified"];
  const idx = levels.indexOf(current);
  return idx < levels.length - 1 ? levels[idx + 1] : null;
}

export function getReportsToNextLevel(
  current: TrustLevel,
  reportCount: number
): number {
  const next = getNextTrustLevel(current);
  if (!next) return 0;
  return Math.max(0, TRUST_THRESHOLDS[next].min - reportCount);
}

export function trustScoreToLabel(score: number): string {
  if (score >= 70) return "موثوق جداً";
  if (score >= 40) return "معقول";
  return "بحاجة تأكيد";
}

export function trustScoreToColor(score: number): string {
  if (score >= 70) return "text-confirm";
  if (score >= 40) return "text-sand";
  return "text-mist";
}

export function confirmationsToDotsCount(confirmations: number): number {
  if (confirmations <= 0) return 0;
  return Math.min(confirmations, 5);
}
