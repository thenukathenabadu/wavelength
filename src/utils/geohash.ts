/**
 * Minimal geohash utilities for Firestore geo-queries (Phase 2).
 * Uses geofire-common encoding (base32 character set).
 * Precision 9 ≈ ±2.4m, precision 6 ≈ ±610m.
 */

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export function encode(lat: number, lon: number, precision = 9): string {
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let geohash = '';

  let minLat = -90, maxLat = 90;
  let minLon = -180, maxLon = 180;

  while (geohash.length < precision) {
    if (evenBit) {
      const mid = (minLon + maxLon) / 2;
      if (lon >= mid) {
        idx = idx * 2 + 1;
        minLon = mid;
      } else {
        idx = idx * 2;
        maxLon = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) {
        idx = idx * 2 + 1;
        minLat = mid;
      } else {
        idx = idx * 2;
        maxLat = mid;
      }
    }
    evenBit = !evenBit;

    if (++bit === 5) {
      geohash += BASE32[idx];
      bit = 0;
      idx = 0;
    }
  }

  return geohash;
}

/**
 * Returns the 8 neighboring geohash cells + the cell itself.
 * Useful for range queries (include cells at the border of the search radius).
 */
export function neighbors(geohash: string): string[] {
  // Stub — full neighbor logic requires decode + re-encode for each direction.
  // Implement fully in Phase 2 when geo-queries are wired up.
  return [geohash];
}
