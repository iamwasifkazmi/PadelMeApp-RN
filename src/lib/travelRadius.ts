/** Same options as Edit Profile → Availability → Travel radius. */
export const TRAVEL_RADIUS_OPTIONS_KM = [5, 10, 20, 50] as const;

export const DEFAULT_TRAVEL_RADIUS_KM = 10;

export type TravelRadiusKm = (typeof TRAVEL_RADIUS_OPTIONS_KM)[number];

export function coerceTravelRadiusKm(
  raw: unknown,
  fallback: number = DEFAULT_TRAVEL_RADIUS_KM,
): TravelRadiusKm {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback as TravelRadiusKm;
  const allowed = TRAVEL_RADIUS_OPTIONS_KM as readonly number[];
  if (allowed.includes(n)) return n as TravelRadiusKm;
  let best = fallback;
  for (const opt of allowed) {
    if (Math.abs(opt - n) < Math.abs(best - n)) best = opt;
  }
  return best as TravelRadiusKm;
}

/** Rough miles label for UK users (search still uses km on the server). */
export function travelRadiusMilesLabel(km: number): string {
  const mi = Math.round(km * 0.621371);
  return `~${mi} mi`;
}
