/** Shared shape for anything that carries a user's saved place. */
export type UserLocationFields = {
  location?: string | null;
  locationName?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
};

/** Human-readable label: place name when available, else formatted coordinates. */
export function userLocationLabel(u: UserLocationFields): string {
  const name = (u.locationName || u.location || "").trim();
  if (name) return name;
  if (
    u.locationLat != null &&
    u.locationLng != null &&
    Number.isFinite(u.locationLat) &&
    Number.isFinite(u.locationLng)
  ) {
    return `${u.locationLat.toFixed(4)}, ${u.locationLng.toFixed(4)}`;
  }
  return "";
}

export function hasUserGeo(u: UserLocationFields): boolean {
  return (
    u.locationLat != null &&
    u.locationLng != null &&
    Number.isFinite(u.locationLat) &&
    Number.isFinite(u.locationLng)
  );
}
