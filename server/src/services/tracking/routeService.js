const { haversineDistanceKm } = require('../dispatch/travelTimeService');

const ROUTE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OSRM_TIMEOUT_MS = 3000;
const routeCache = new Map();

function buildCacheKey(origin, destination) {
  return `${Number(origin[0]).toFixed(4)},${Number(origin[1]).toFixed(4)}|${Number(destination[0]).toFixed(4)},${Number(destination[1]).toFixed(4)}`;
}

async function fetchOsrmOnce(url, timeoutMs = OSRM_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`OSRM responded with HTTP ${res.status}`);
    }
    const json = await res.json();
    if (!json.routes || json.routes.length === 0 || !json.routes[0].geometry) {
      throw new Error('OSRM returned no routes');
    }
    return json.routes[0];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetches route geometry, distance (meters), and duration (seconds) from OSRM
 * with 3s timeout, 1 retry, in-memory cache, and straight-line Haversine fallback.
 */
async function getRoute({ origin, destination, avgSpeedKmh = 30 }) {
  if (!Array.isArray(origin) || origin.length < 2 || !Array.isArray(destination) || destination.length < 2) {
    throw new Error('Valid origin and destination [lng, lat] coordinates are required');
  }

  const key = buildCacheKey(origin, destination);
  const cached = routeCache.get(key);
  if (cached && Date.now() - cached.cachedAt < ROUTE_CACHE_TTL_MS) {
    return cached.value;
  }

  const baseUrl = (process.env.OSRM_BASE_URL || 'https://router.project-osrm.org').replace(/\/+$/, '');
  const url = `${baseUrl}/route/v1/driving/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?overview=full&geometries=geojson`;

  let route = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      route = await fetchOsrmOnce(url, OSRM_TIMEOUT_MS);
      break;
    } catch {
      // Retry once on timeout or network error
    }
  }

  let result;
  if (route) {
    result = {
      geometry: route.geometry,
      distanceMeters: Math.round(route.distance),
      durationSeconds: Math.round(route.duration),
      source: 'osrm',
    };
  } else {
    const distKm = haversineDistanceKm(origin, destination);
    const speed = avgSpeedKmh > 0 ? avgSpeedKmh : 30;
    result = {
      geometry: {
        type: 'LineString',
        coordinates: [origin, destination],
      },
      distanceMeters: Math.round(distKm * 1000),
      durationSeconds: Math.round((distKm / speed) * 3600),
      source: 'estimate',
    };
  }

  if (routeCache.size > 500) {
    routeCache.clear();
  }
  routeCache.set(key, { value: result, cachedAt: Date.now() });

  return result;
}

function clearRouteCache() {
  routeCache.clear();
}

module.exports = {
  getRoute,
  clearRouteCache,
  OSRM_TIMEOUT_MS,
};
