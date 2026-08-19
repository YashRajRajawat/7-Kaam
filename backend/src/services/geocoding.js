/**
 * Geocoding service — converts a city / locality string into lat/lng.
 *
 * Uses Nominatim (OpenStreetMap) which is free with a 1 req/s rate limit.
 * We do a best-effort geocode at registration; if it fails we skip silently
 * so registration still completes.
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = '7KaamPlatform/1.0 (contact@7kaam.in)';

let _lastCallMs = 0;

/**
 * Geocode an address string to { lat, lng }.
 * @param {string} query  e.g. "Indiranagar, Bangalore, India"
 * @returns {Promise<{ lat: number, lng: number } | null>}
 */
async function geocodeAddress(query) {
  try {
    // Rate-limit: Nominatim requires >=1 s between requests
    const now = Date.now();
    const wait = 1050 - (now - _lastCallMs);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    _lastCallMs = Date.now();

    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '1',
      countrycodes: 'in',
    });

    const res = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.length === 0) return null;

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    };
  } catch {
    return null;
  }
}

module.exports = { geocodeAddress };
