/**
 * 1–10 inverted scale (matches Base44 `EditProfile`): 1 = Pro, 10 = Just starting.
 * Tier text colours follow Base44 `SKILL_CATEGORY_COLOR` (Tailwind 600 hex).
 */
export const PADEL_SKILL_LABELS: Record<number, string> = {
  1: "Pro",
  2: "Expert",
  3: "Advanced+",
  4: "Advanced",
  5: "Intermediate+",
  6: "Intermediate",
  7: "Beginner+",
  8: "Beginner",
  9: "Novice",
  10: "Just starting",
};

/** Base44: Advanced (1–3), Intermediate (4–6), Beginner (7–10) */
export type PadelSkillTier = "advanced" | "intermediate" | "beginner";

export function padelSkillTierFromNumeric(n: number): PadelSkillTier {
  if (n <= 3) return "advanced";
  if (n <= 6) return "intermediate";
  return "beginner";
}

/** Base44 `SKILL_CATEGORY` display (title case). */
export function padelSkillCategoryLabel(n: number): string {
  const t = padelSkillTierFromNumeric(n);
  if (t === "advanced") return "Advanced";
  if (t === "intermediate") return "Intermediate";
  return "Beginner";
}

/** Base44 Tailwind text-purple/blue/green-600 → hex for React Native. */
export function padelSkillTierAccentColor(tier: PadelSkillTier): string {
  if (tier === "advanced") return "#9333EA";
  if (tier === "intermediate") return "#2563EB";
  return "#16A34A";
}

export function padelSkillAccentForNumeric(n: number | null | undefined): string {
  if (n == null || n < 1 || n > 10) return "#6B7280";
  return padelSkillTierAccentColor(padelSkillTierFromNumeric(n));
}

export function clampPadelSkillLevel(n: number | null | undefined): number | null {
  if (n == null || Number.isNaN(n)) return null;
  const x = Math.round(n);
  if (x < 1 || x > 10) return null;
  return x;
}

/** e.g. "Advanced · Advanced+" */
export function formatPadelSkillLine(n: number | null | undefined): string | null {
  const c = clampPadelSkillLevel(n);
  if (c == null) return null;
  return `${padelSkillCategoryLabel(c)} · ${PADEL_SKILL_LABELS[c]}`;
}

/** Distance string for player cards, when viewer coords and target coords exist. */
export function formatDistanceAway(km: number | null | undefined): string | null {
  if (km == null || Number.isNaN(km)) return null;
  if (km < 1) return "Nearby";
  return `${km} km away`;
}
