import type { MatchDto } from "./types";

/** YYYY-MM-DD (UTC) — same rules as Backend `matchSchedule` / Prisma stored dates. */
export function dateKeyUtcFromMatchDate(date: string | Date | number): string {
  const d = typeof date === "number" ? new Date(date) : typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

function scheduledStartUtcMs(dateStr: string, timeLabel: string): number {
  const base = new Date(dateStr.trim());
  if (Number.isNaN(base.getTime())) return NaN;
  const parts = String(timeLabel || "").trim().split(":");
  const h = Number.parseInt(parts[0] ?? "", 10);
  const m = Number.parseInt(parts[1] ?? "", 10);
  return Date.UTC(
    base.getUTCFullYear(),
    base.getUTCMonth(),
    base.getUTCDate(),
    Number.isFinite(h) ? h : 0,
    Number.isFinite(m) ? m : 0,
    0,
    0,
  );
}

export function matchScheduledStartUtcMs(match: { date: string | Date | number; timeLabel: string }): number {
  const dateStr = dateKeyUtcFromMatchDate(match.date);
  if (!dateStr) return NaN;
  return scheduledStartUtcMs(dateStr, String(match.timeLabel || "").trim());
}

const MS_MIN = 60 * 1000;
const MS_HOUR = 60 * MS_MIN;
const MS_24H = 24 * MS_HOUR;
const STALE_CANCEL_GRACE_MS = 120_000;
const JOIN_GRACE_MS = 120_000;
const DEFAULT_INSTANT_DURATION_MIN = 90;

function normalizeStatus(raw: string | undefined): string {
  return (raw == null || String(raw).trim() === "" ? "open" : String(raw).trim()).toLowerCase();
}

/** UTC epoch when the playable window ends (start + duration). */
export function matchPlayWindowEndUtcMs(match: {
  date: string | Date | number;
  timeLabel: string;
  durationMinutes?: number | null;
}): number {
  const start = matchScheduledStartUtcMs(match);
  if (Number.isNaN(start)) return NaN;
  const mins =
    typeof match.durationMinutes === "number" && Number.isFinite(match.durationMinutes)
      ? Math.max(30, Math.trunc(match.durationMinutes))
      : DEFAULT_INSTANT_DURATION_MIN;
  return start + mins * MS_MIN;
}

export function matchPlayWindowHasEnded(
  match: { date: string | Date | number; timeLabel: string; durationMinutes?: number | null },
  nowMs = Date.now(),
  graceMs = STALE_CANCEL_GRACE_MS,
): boolean {
  const end = matchPlayWindowEndUtcMs(match);
  if (Number.isNaN(end)) return true;
  return end + graceMs < nowMs;
}

/** Full roster may start until 24h after scheduled start (same as auto-cancel policy). */
export function fullRosterStartWindowExpired(
  match: { date: string | Date | number; timeLabel: string; isInstant?: boolean },
  nowMs = Date.now(),
): boolean {
  if (match.isInstant) return matchPlayWindowHasEnded(match, nowMs);
  const start = matchScheduledStartUtcMs(match);
  if (Number.isNaN(start)) return true;
  return start + MS_24H + STALE_CANCEL_GRACE_MS < nowMs;
}

/** Auto-cancel deadline when roster is full but the match was never started (server policy). */
export function fullRosterAutoCancelDeadlineUtcMs(match: {
  date: string | Date | number;
  timeLabel: string;
  isInstant?: boolean;
}): number {
  if (match.isInstant) return NaN;
  const start = matchScheduledStartUtcMs(match);
  if (Number.isNaN(start)) return NaN;
  return start + MS_24H;
}

/** Human-readable time until `deadlineMs` (UTC epoch), e.g. "3 hours", "45 minutes". */
export function formatDurationUntil(deadlineMs: number, nowMs = Date.now()): string {
  const left = deadlineMs - nowMs;
  if (left <= 0) return "moments";
  const h = Math.floor(left / MS_HOUR);
  const m = Math.ceil((left % MS_HOUR) / MS_MIN);
  if (h >= 1) return `${h} hour${h === 1 ? "" : "s"}`;
  return `${Math.max(1, m)} minute${m === 1 ? "" : "s"}`;
}

/** Join still allowed shortly before start (matches backend join window). */
export function scheduledNonInstantJoinAllowed(
  match: { date: string | Date; timeLabel: string; isInstant?: boolean },
  nowMs = Date.now(),
): boolean {
  if (match.isInstant) return true;
  const start = matchScheduledStartUtcMs(match);
  if (Number.isNaN(start)) return false;
  return start >= nowMs - JOIN_GRACE_MS;
}

/** True when scheduled local clock (UTC calendar + timeLabel) is already in the past. */
export function scheduledNonInstantSlotIsExpired(
  match: { date: string | Date; timeLabel: string; isInstant?: boolean },
  nowMs = Date.now(),
  graceMs = STALE_CANCEL_GRACE_MS,
): boolean {
  if (match.isInstant) return false;
  const start = matchScheduledStartUtcMs(match);
  if (Number.isNaN(start)) return true;
  return start + graceMs < nowMs;
}

/**
 * Lists (discovery, home upcoming): hide open/full rows once their slot or start window has passed.
 */
export function matchAppearsOnDiscoveryListBySchedule(match: MatchDto): boolean {
  const st = normalizeStatus(match.status);
  const slot = {
    date: match.date,
    timeLabel: String(match.timeLabel || "").trim(),
    isInstant: !!match.isInstant,
    durationMinutes: match.durationMinutes,
  };

  if (st === "open" || st === "full") {
    if (match.isInstant) return !matchPlayWindowHasEnded(slot);
    if (st === "open") {
      return !scheduledNonInstantSlotIsExpired({
        date: match.date,
        timeLabel: slot.timeLabel,
        isInstant: false,
      });
    }
    return !fullRosterStartWindowExpired(slot);
  }
  return true;
}
