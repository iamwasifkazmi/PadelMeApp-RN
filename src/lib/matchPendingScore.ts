import { MatchDto } from "./types";
import { isDoublesFormat } from "./matchFormat";

export function emailsMatch(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Mirrors backend `actorCanValidatePendingScore` for confirm / reject / dispute UI. */
export function viewerCanValidatePendingScore(
  m: MatchDto,
  viewer: string,
  hostEmail: string | null,
  submitter: string | null | undefined,
): boolean {
  if (!submitter?.trim() || emailsMatch(submitter, viewer)) return false;
  if (!(m.players || []).some((p) => emailsMatch(p, viewer))) return false;
  if (hostEmail && emailsMatch(hostEmail, viewer)) return true;
  if (isDoublesFormat(m)) {
    const capA = (m.teamACaptainEmail || m.teamA?.[0] || "").trim();
    const capB = (m.teamBCaptainEmail || m.teamB?.[0] || "").trim();
    if (capA && emailsMatch(capA, viewer)) return true;
    if (capB && emailsMatch(capB, viewer)) return true;
    return false;
  }
  return true;
}

/** Display: "6–2, 1–6, 4–6" from comma-separated per-team set strings. */
export function formatSubmittedScoreDisplay(scoreTeamA: string, scoreTeamB: string): string {
  const as = (scoreTeamA || "").split(",").map((s) => s.trim());
  const bs = (scoreTeamB || "").split(",").map((s) => s.trim());
  const n = Math.max(as.length, bs.length, 1);
  const pairs: { line: string; isUnused: boolean }[] = [];
  for (let i = 0; i < n; i++) {
    const aRaw = as[i] ?? "";
    const bRaw = bs[i] ?? "";
    const aNum = aRaw === "" ? NaN : Number(aRaw);
    const bNum = bRaw === "" ? NaN : Number(bRaw);
    const isUnused =
      (aRaw === "" || aNum === 0) && (bRaw === "" || bNum === 0) && !Number.isNaN(aNum) && !Number.isNaN(bNum);
    const aDisp = aRaw !== "" ? aRaw : "0";
    const bDisp = bRaw !== "" ? bRaw : "0";
    pairs.push({ line: `${aDisp}–${bDisp}`, isUnused });
  }
  while (pairs.length > 1 && pairs[pairs.length - 1].isUnused) {
    pairs.pop();
  }
  const lines = pairs.map((p) => p.line).filter((line) => line !== "—–—");
  if (!lines.length) return "—";
  if (lines.length === 1) {
    const [one] = lines;
    if (one.includes("–")) {
      const [a, b] = one.split("–");
      if (a && b && a !== "0" && b !== "0") return `${a} – ${b}`;
    }
    return one;
  }
  return lines.join(", ");
}

export function matchUsesSetBasedScoring(m: MatchDto): boolean {
  return (m.scoringMode || "").toLowerCase() === "sets";
}

/** Rows in the score grid for set-based matches (fixed at create time: 1, 3, or 5). */
export function scoringGridRowsForNumSets(numSets: number | null | undefined): number {
  const n = typeof numSets === "number" ? numSets : 1;
  if (n === 1 || n === 3 || n === 5) return n;
  return Math.min(5, Math.max(1, Math.round(n)));
}

export function scoringGridRowsForSubmit(m: MatchDto): number {
  return scoringGridRowsForNumSets(m.numSets);
}

export function matchScoringSubtitle(m: MatchDto): string {
  if (!matchUsesSetBasedScoring(m)) return "";
  const g = effectiveGamesPerSet(m);
  const rows = scoringGridRowsForSubmit(m);
  if (rows === 1) return `1 set · First to ${g} games`;
  if (rows === 3) return `Best of 3 sets · First to ${g} games`;
  if (rows === 5) return `Best of 5 sets · First to ${g} games`;
  return `First to ${g} games per set`;
}

export function effectiveGamesPerSet(m: MatchDto): number {
  const g = m.gamesPerSet;
  if (typeof g === "number" && g >= 1) return Math.min(21, Math.max(1, g));
  return 6;
}

/** Base44-style: anyone on the roster (except submitter) may open confirm — modal enforces captain/organiser. */
export function shouldShowConfirmScoreCta(m: MatchDto, viewerEmail: string): boolean {
  const host = m.hostEmail ?? null;
  const joined = (m.players || []).some((p) => emailsMatch(p, viewerEmail));
  const isOrganizer = Boolean(host && emailsMatch(host, viewerEmail));
  const hasProposed =
    Boolean(m.pendingScoreTeamA?.trim()) &&
    (m.status === "awaiting_score" || m.status === "pending_validation");
  return Boolean(
    hasProposed &&
      m.scoreSubmittedBy &&
      !emailsMatch(m.scoreSubmittedBy, viewerEmail) &&
      (joined || isOrganizer),
  );
}
