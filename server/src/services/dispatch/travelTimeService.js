/**
 * Travel Time Service
 * Estimates travel distance and ETA between coordinates using OSRM public routing API,
 * with caching, timeout/retry resilience, and fallback to Haversine formula + avg speed.
 */

const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Calculates Great-Circle distance in kilometers using the Haversine formula.
 * @param {[number, number]} coord1 [lng, lat]
 * @param {[number, number]} coord2 [lng, lat]
 * @returns {number} Distance in kilometers
 */
const haversineDistanceKm = (coord1, coord2) => {
  if (!coord1 || !coord2) return 0;
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;

  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 100) / 100;
};

/**
 * Computes ETA using fallback average speed.
 * @param {number} distanceKm
 * @param {number} avgSpeedKmh
 * @returns {number} ETA in minutes
 */
const computeFallbackEtaMinutes = (distanceKm, avgSpeedKmh = 30) => {
  if (!distanceKm || distanceKm <= 0) return 1;
  const speed = avgSpeedKmh > 0 ? avgSpeedKmh : 30;
  const hours = distanceKm / speed;
  return Math.max(1, Math.round(hours * 60));
};

/**
 * Calls OSRM public routing service with 3-second timeout and 1 retry.
 * @param {[number, number]} origin [lng, lat]
 * @param {[number, number]} destination [lng, lat]
 * @param {number} avgSpeedKmh
 * @returns {Promise<{ distanceKm: number, etaMinutes: number, source: string }>}
 */
const getRouteEstimate = async (origin, destination, avgSpeedKmh = 30) => {
  if (!origin || !destination) {
    return { distanceKm: 0, etaMinutes: 0, source: 'invalid_coords' };
  }

  const cacheKey = `${origin[0].toFixed(4)},${origin[1].toFixed(4)}->${destination[0].toFixed(4)},${destination[1].toFixed(4)}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const fallbackDistance = haversineDistanceKm(origin, destination);
  const fallbackEta = computeFallbackEtaMinutes(fallbackDistance, avgSpeedKmh);

  const url = `http://router.project-osrm.org/route/v1/driving/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?overview=false`;

  const fetchWithTimeout = async (attempt = 1) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`OSRM HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = Math.round((route.distance / 1000) * 100) / 100;
        const etaMinutes = Math.max(1, Math.round(route.duration / 60));
        return { distanceKm, etaMinutes, source: 'osrm' };
      }
      throw new Error('OSRM empty routes');
    } catch (err) {
      clearTimeout(timeout);
      if (attempt < 2) {
        // Retry once after 200ms
        await new Promise((res) => setTimeout(res, 200));
        return fetchWithTimeout(attempt + 1);
      }
      throw err;
    }
  };

  let result;
  try {
    result = await fetchWithTimeout(1);
  } catch (err) {
    result = {
      distanceKm: fallbackDistance,
      etaMinutes: fallbackEta,
      source: 'haversine_fallback',
    };
  }

  cache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
};

module.exports = {
  haversineDistanceKm,
  computeFallbackEtaMinutes,
  getRouteEstimate,
};
