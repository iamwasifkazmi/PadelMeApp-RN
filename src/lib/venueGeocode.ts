import { api } from "./api";
import { APP_ORIGIN } from "../config/domain";

const NOMINATIM_UA = `MiPadel/1.0 (+${APP_ORIGIN}; venue-search; contact@mipadel.co.uk)`;

export type VenueCoordinateInput = {
  name?: string;
  address?: string;
  city?: string;
  postcode?: string;
};

/** Server geocode (preferred) — multiple UK query variants, avoids client rate limits. */
export async function resolveVenueCoordinatesFromApi(
  input: VenueCoordinateInput,
): Promise<{ lat: number; lng: number } | null> {
  try {
    return await api.post<{ lat: number; lng: number }>("/venues/resolve-coordinates", input);
  } catch {
    return null;
  }
}

/** Best-effort geocode fallback when API is unavailable. */
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

/** Resolve coordinates via API, then client Nominatim as fallback. */
export async function resolveVenueCoordinates(
  input: VenueCoordinateInput,
): Promise<{ lat: number; lng: number } | null> {
  const fromApi = await resolveVenueCoordinatesFromApi(input);
  if (fromApi) return fromApi;
  const q = [input.name, input.address, input.postcode, input.city].filter(Boolean).join(", ");
  return geocodePlaceQuery(q);
}
