/** Lowercase trim for roster / inbox email comparison (matches backend norm). */
export function normEmail(e: string) {
  return String(e || "").trim().toLowerCase();
}

/** True if this is a direct thread containing exactly these two participants (order-independent). */
export function isDirectDmBetween(
  c: { type: string; participantEmails?: string[] | null },
  emailA: string,
  emailB: string,
): boolean {
  if (c.type !== "direct" || !Array.isArray(c.participantEmails)) return false;
  const a = normEmail(emailA);
  const b = normEmail(emailB);
  if (!a || !b || a === b) return false;
  const set = new Set(c.participantEmails.map(normEmail));
  return set.has(a) && set.has(b);
}
