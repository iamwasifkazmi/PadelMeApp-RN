import { APP_ORIGIN } from "../config/domain";

const NOMINATIM_UA = `MiPadel/1.0 (+${APP_ORIGIN}; venue-search; contact@mipadel.co.uk)`;

/** Best-effort geocode for manual / TBD venues so match create can supply lat/lng. */
export async function geocodePlaceQuery(query: string): Promise<{ lat: number; lng: number } | null> {
  const q = query.trim();
  if (!q) return null;
  try {
    const url =
      "https://nominatim.openstreetmap.org/search?q=" +
      encodeURIComponent(q) +
      "&format=json&limit=1";
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": NOMINATIM_UA,
      },
    });
    const text = await res.text();
    if (!res.ok || /rate exceeded/i.test(text)) return null;
    let data: Array<{ lat: string; lon: string }>;
    try {
      data = JSON.parse(text) as Array<{ lat: string; lon: string }>;
    } catch {
      return null;
    }
    const hit = data[0];
    if (!hit) return null;
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}
