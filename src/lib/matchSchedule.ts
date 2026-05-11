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

const STALE_CANCEL_GRACE_MS = 120_000;
const JOIN_GRACE_MS = 120_000;

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

/** Open / full games only: hide once the slot has started (matches backend list filter). */
export function matchAppearsOnDiscoveryListBySchedule(match: MatchDto): boolean {
  if (match.isInstant) return true;
  const raw = match.status;
  const st = (raw == null || String(raw).trim() === "" ? "open" : String(raw).trim()).toLowerCase();
  if (st !== "open" && st !== "full") return true;
  return !scheduledNonInstantSlotIsExpired({
    date: match.date,
    timeLabel: String(match.timeLabel || "").trim(),
    isInstant: false,
  });
}
