/** Match Backend `userNeedsOnboarding` — used for post-login routing. */
export function userNeedsOnboarding(me: {
  profileComplete?: boolean | null;
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  bio?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  skillLevel?: number | null;
  needsOnboarding?: boolean;
}): boolean {
  if (me.needsOnboarding === true) return true;
  if (me.needsOnboarding === false) return false;
  if (me.profileComplete === true) return false;

  const hasLegacyProfile =
    Boolean(String(me.bio || "").trim()) &&
    me.locationLat != null &&
    me.locationLng != null &&
    !Number.isNaN(me.locationLat) &&
    !Number.isNaN(me.locationLng) &&
    me.skillLevel != null;

  if (hasLegacyProfile) return false;

  return true;
}

/** Short display name for home header (truncate long emails / names). */
export function homeGreetingName(me?: {
  firstName?: string | null;
  fullName?: string | null;
} | null): string {
  const cap = (s: string, max = 14) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

  if (me?.firstName?.trim()) return cap(me.firstName.trim());

  const raw = (me?.fullName || "").trim();
  if (raw) {
    const first = raw.split(/\s+/)[0] || "Player";
    return cap(first);
  }

  return "Player";
}
