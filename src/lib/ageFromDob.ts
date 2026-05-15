/** Full years from UTC calendar DOB (matches server). */
export function ageFromUtcDateOfBirth(dob: Date, ref: Date = new Date()): number {
  if (Number.isNaN(dob.getTime())) return 0;
  const y = dob.getUTCFullYear();
  const mo = dob.getUTCMonth();
  const d = dob.getUTCDate();
  let age = ref.getUTCFullYear() - y;
  const monthDiff = ref.getUTCMonth() - mo;
  if (monthDiff < 0 || (monthDiff === 0 && ref.getUTCDate() < d)) age -= 1;
  return Math.max(0, Math.min(120, age));
}

/** Noon UTC for a local calendar day (avoids TZ shifting the calendar date). */
export function utcNoonFromParts(year: number, month0: number, day: number): Date {
  return new Date(Date.UTC(year, month0, day, 12, 0, 0, 0));
}
