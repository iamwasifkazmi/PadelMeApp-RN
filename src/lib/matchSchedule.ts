/** Aligns with backend matchSchedule UTC interpretation (stored date + timeLabel). */

function dateKeyUtcFromIso(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

export function scheduledStartUtcMs(dateKey: string, timeLabel: string): number {
  const base = new Date(dateKey.trim());
  if (Number.isNaN(base.getTime())) return NaN;
  const parts = String(timeLabel || "").split(":");
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

const JOIN_GRACE_MS = 120_000;

export function scheduledNonInstantJoinAllowed(match: {
  date: string;
  timeLabel: string;
  isInstant?: boolean;
}, nowMs = Date.now()): boolean {
  if (match.isInstant) return true;
  const dk = dateKeyUtcFromIso(match.date);
  if (!dk) return false;
  const start = scheduledStartUtcMs(dk, match.timeLabel);
  if (Number.isNaN(start)) return false;
  return start >= nowMs - JOIN_GRACE_MS;
}
