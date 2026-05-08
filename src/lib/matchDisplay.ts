import type { MatchDto } from "./types";

/** Default titles from create flow — keep in sync with CreateMatchScreen. */
const STOCK_DOUBLES = /^padel\s+doubles$/i;
const STOCK_SINGLES = /^padel\s+singles$/i;
const STOCK_MIXED = /^mixed\s+padel$/i;

function isSinglesMatch(match: Pick<MatchDto, "matchType" | "maxPlayers">): boolean {
  if (match.matchType === "singles") return true;
  if (match.matchType === "doubles" || match.matchType === "mixed_doubles") return false;
  return (match.maxPlayers ?? 4) <= 2;
}

/**
 * Corrects stock titles when they disagree with match format (e.g. singles saved as "Padel Doubles").
 */
export function displayMatchTitle(match: Pick<MatchDto, "title" | "matchType" | "maxPlayers">): string {
  const raw = (match.title || "").trim();
  if (!raw) return "Padel match";

  if (match.matchType === "mixed_doubles") {
    if (STOCK_DOUBLES.test(raw) || STOCK_SINGLES.test(raw)) return "Mixed Padel";
    return raw;
  }

  if (isSinglesMatch(match)) {
    if (STOCK_DOUBLES.test(raw)) return "Padel Singles";
    return raw;
  }

  if (STOCK_SINGLES.test(raw)) return "Padel Doubles";
  if (STOCK_MIXED.test(raw) && match.matchType === "doubles") return "Padel Doubles";
  return raw;
}
