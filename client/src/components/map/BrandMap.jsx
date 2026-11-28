'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Plus, Minus, Navigation, AlertTriangle, RotateCcw, Clock } from 'lucide-react';
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_STYLE_URL,
  DEFAULT_MAP_STYLE_URL_FALLBACK,
  MUMBAI_AREA_PRESETS,
} from '@/lib/config';

export const MAP_ERROR_MESSAGES = {
  webgl: "Your browser can't display the map. Turn on hardware acceleration in your browser settings, then reload.",
  tiles: "We couldn't load the map. Check your connection and try again.",
};

/**
 * Checks whether WebGL is available in the current browser before initializing MapLibre GL.
 */
export function isWebGLSupported() {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      typeof window !== 'undefined' &&
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

/**
 * Pure state transition for style load failures:
 * 1) Retry primary style once
 * 2) Switch to fallback style if configured and distinct
 * 3) Otherwise give up and surface ErrorState
 */
export function resolveNextStyleAttempt({
  primaryRetryUsed = false,
  fallbackUsed = false,
  primaryUrl = DEFAULT_MAP_STYLE_URL,
  fallbackUrl = DEFAULT_MAP_STYLE_URL_FALLBACK,
}) {
  if (!primaryRetryUsed) {
    return { action: 'retry_primary', styleUrl: primaryUrl, primaryRetryUsed: true, fallbackUsed };
  }
  if (!fallbackUsed && fallbackUrl && fallbackUrl !== primaryUrl) {
    return { action: 'use_fallback', styleUrl: fallbackUrl, primaryRetryUsed: true, fallbackUsed: true };
  }
  return { action: 'fail', styleUrl: null, primaryRetryUsed: true, fallbackUsed };
}

/**
 * Generates a geodesic circle GeoJSON polygon around [lng, lat] with radiusKm.
 */
export function buildGeodesicCirclePolygon(centerLngLat, radiusKm, points = 64) {
  const [lng, lat] = centerLngLat;
  const earthRadiusKm = 6371;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const angularDistance = radiusKm / earthRadiusKm;

  const coords = [];
  for (let i = 0; i <= points; i++) {
    const bearing = (2 * Math.PI * i) / points;
    const sinLat2 =
      Math.sin(latRad) * Math.cos(angularDistance) +
      Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing);
    const lat2 = Math.asin(sinLat2);
    const y = Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad);
    const x = Math.cos(angularDistance) - Math.sin(latRad) * sinLat2;
    const lng2 = lngRad + Math.atan2(y, x);
    coords.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
  };
}

/**
 * Finds the nearest index along a LineString to a current coordinate to split completed vs remaining route.
 */
function splitRouteAtPosition(routeCoords, techCoords) {
  if (!Array.isArray(routeCoords) || routeCoords.length < 2 || !techCoords) {
    return { completed: [], remaining: routeCoords || [] };
  }
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < routeCoords.length; i++) {
    const dx = routeCoords[i][0] - techCoords[0];
    const dy = routeCoords[i][1] - techCoords[1];
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return {
    completed: bestIdx > 0 ? [...routeCoords.slice(0, bestIdx + 1), techCoords] : [],
    remaining: [techCoords, ...routeCoords.slice(bestIdx)],
  };
}

function createCustomerMarkerEl(label = 'Customer location') {
  const el = document.createElement('div');
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', label);
  el.className = 'brand-map-marker-customer';
  el.innerHTML = `
    <div style="width:28px;height:28px;border-radius:9999px;background:#12161C;border:2px solid #FFFFFF;display:flex;align-items:center;justify-content:center;">
      <div style="width:10px;height:10px;border-radius:9999px;background:#FFB400;"></div>
    </div>
  `;
  return el;
}

function getCategorySvg(category = 'plumbing') {
  const cat = String(category).toLowerCase();
  if (cat.includes('hvac') || cat.includes('ac')) {
    // Snowflake icon
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFB400" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="22"/><path d="m20 16-4-4 4-4"/><path d="m4 8 4 4-4 4"/><path d="m16 4-4 4-4-4"/><path d="m8 20 4-4 4 4"/></svg>';
  }
  if (cat.includes('delivery')) {
    // Truck icon
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFB400" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>';
  }
  // Wrench icon (default / plumbing)
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFB400" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>';
}

function createTechnicianMarkerEl(category = 'plumbing', heading = 0, label = 'Assigned technician') {
  const el = document.createElement('div');
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', label);
  el.innerHTML = `
    <div data-rotate-wrap="true" style="width:36px;height:36px;border-radius:10px;background:#12161C;border:2px solid #FFB400;display:flex;align-items:center;justify-content:center;transform:rotate(${heading || 0}deg);transition:transform 0.25s linear;">
      ${getCategorySvg(category)}
    </div>
  `;
  return el;
}

function createDeliveryPinEl(type = 'pickup') {
  const isPickup = type === 'pickup';
  const el = document.createElement('div');
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', isPickup ? 'Pickup location' : 'Drop-off location');
  el.innerHTML = `
    <div style="padding:2px 8px;border-radius:9999px;background:${isPickup ? '#12161C' : '#FFB400'};color:${isPickup ? '#FFFFFF' : '#12161C'};border:2px solid #FFFFFF;font-size:11px;font-weight:700;font-family:sans-serif;white-space:nowrap;">
      ${isPickup ? 'Pickup' : 'Drop-off'}
    </div>
  `;
  return el;
}

/**
 * Reusable MapLibre GL + OpenFreeMap component used across customer, technician, and admin screens.
 */
export default function BrandMap({
  mode = 'tracking', // 'picker' | 'delivery-picker' | 'tracking' | 'service-area' | 'admin'
  center = DEFAULT_MAP_CENTER.coordinates,
  zoom = DEFAULT_MAP_CENTER.zoom,
  customerCoords,
  technicianCoords,
  technicianHeading = 0,
  technicianName,
  category = 'plumbing',
  eta,
  distanceKm,
  routeGeometry,
  pickupCoords,
  dropoffCoords,
  radiusKm = 10,
  onLocationChange,
  onPickupChange,
  onDropoffChange,
  onRadiusChange,
  address,
  onAddressChange,
  showPresets = false,
  adminMarkers = [], // [{ id, coordinates, label, type: 'booking'|'technician', category }]
  onAdminMarkerClick,
  heightClass = 'h-72 sm:h-80',
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const maplibreRef = useRef(null);
  const markersRef = useRef({});
  const animFrameRef = useRef(null);
  const lastTechPosRef = useRef(technicianCoords || null);

  const [loading, setLoading] = useState(true);
  const [errorType, setErrorType] = useState(null); // null | 'webgl' | 'tiles'
  const [scrollUnlocked, setScrollUnlocked] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const mapError = Boolean(errorType);
  const styleStateRef = useRef({ primaryRetryUsed: false, fallbackUsed: false, loaded: false });

  const applyBrandStyleTweaks = useCallback((map) => {
    try {
      const style = map.getStyle();
      if (!style || !Array.isArray(style.layers)) return;
      for (const layer of style.layers) {
        if (layer.type === 'fill' && layer.id.includes('water')) {
          map.setPaintProperty(layer.id, 'fill-color', '#DCE6EE');
        } else if (layer.type === 'fill' && (layer.id.includes('park') || layer.id.includes('grass'))) {
          map.setPaintProperty(layer.id, 'fill-color', '#E8EDE6');
        }
      }
    } catch {
      // Safe no-op if style layer paint properties differ
    }
  }, []);

  const ensureRouteLayers = useCallback((map) => {
    if (!map.getSource('dispatchly-route-remaining')) {
      map.addSource('dispatchly-route-remaining', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'dispatchly-route-casing',
        type: 'line',
        source: 'dispatchly-route-remaining',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#FFFFFF', 'line-width': 7 },
      });
      map.addLayer({
        id: 'dispatchly-route-ink',
        type: 'line',
        source: 'dispatchly-route-remaining',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#12161C', 'line-width': 4 },
      });
    }

    if (!map.getSource('dispatchly-route-completed')) {
      map.addSource('dispatchly-route-completed', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'dispatchly-route-amber',
        type: 'line',
        source: 'dispatchly-route-completed',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#FFB400', 'line-width': 4 },
      });
    }
  }, []);

  const ensureServiceAreaLayers = useCallback((map) => {
    if (!map.getSource('dispatchly-service-area')) {
      map.addSource('dispatchly-service-area', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'dispatchly-service-area-fill',
        type: 'fill',
        source: 'dispatchly-service-area',
        paint: { 'fill-color': '#FFB400', 'fill-opacity': 0.16 },
      });
      map.addLayer({
        id: 'dispatchly-service-area-outline',
        type: 'line',
        source: 'dispatchly-service-area',
        paint: { 'line-color': '#12161C', 'line-width': 2 },
      });
    }
  }, []);

  // Initialize MapLibre instance client-side only
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorType(null);
    styleStateRef.current = { primaryRetryUsed: false, fallbackUsed: false, loaded: false };

    if (!isWebGLSupported()) {
      setLoading(false);
      setErrorType('webgl');
      return;
    }

    (async () => {
      try {
        const maplibreglModule = await import('maplibre-gl');
        const maplibregl = maplibreglModule.default || maplibreglModule;
        if (cancelled || !containerRef.current) return;
        if (typeof maplibregl.setWorkerUrl === 'function') {
          maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');
        }
        maplibreRef.current = maplibregl;

        const initialCenter =
          mode === 'picker'
            ? customerCoords || center
            : mode === 'delivery-picker'
            ? pickupCoords || center
            : customerCoords || center;

        const map = new maplibregl.Map({
          container: containerRef.current,
          style: DEFAULT_MAP_STYLE_URL,
          center: initialCenter || DEFAULT_MAP_CENTER.coordinates,
          zoom: zoom || DEFAULT_MAP_CENTER.zoom,
          scrollZoom: false,
          attributionControl: true,
        });

        mapRef.current = map;

        const onStyleReady = () => {
          if (cancelled) return;
          styleStateRef.current.loaded = true;
          applyBrandStyleTweaks(map);
          ensureRouteLayers(map);
          ensureServiceAreaLayers(map);
          setLoading(false);
          setErrorType(null);
        };

        map.on('load', onStyleReady);
        map.on('style.load', () => {
          if (cancelled) return;
          applyBrandStyleTweaks(map);
          ensureRouteLayers(map);
          ensureServiceAreaLayers(map);
        });

        map.on('error', (event) => {
          if (cancelled) return;
          const errObj = event?.error || {};
          if (process.env.NODE_ENV !== 'production') {
            console.error('[BrandMap Error]', {
              message: errObj.message || 'Unknown MapLibre error',
              status: errObj.status,
              url: errObj.url || event?.sourceId,
              error: errObj,
            });
          }

          // If WebGL context lost or failed during init
          if (errObj.message && /webgl/i.test(errObj.message)) {
            setLoading(false);
            setErrorType('webgl');
            return;
          }

          // Retry once on primary style, then switch to fallback style if configured
          if (!styleStateRef.current.loaded || (errObj.status && errObj.status >= 400)) {
            const next = resolveNextStyleAttempt({
              primaryRetryUsed: styleStateRef.current.primaryRetryUsed,
              fallbackUsed: styleStateRef.current.fallbackUsed,
              primaryUrl: DEFAULT_MAP_STYLE_URL,
              fallbackUrl: DEFAULT_MAP_STYLE_URL_FALLBACK,
            });

            if (next.action === 'retry_primary' || next.action === 'use_fallback') {
              styleStateRef.current.primaryRetryUsed = next.primaryRetryUsed;
              styleStateRef.current.fallbackUsed = next.fallbackUsed;
              try {
                map.setStyle(next.styleUrl, { diff: false });
                return;
              } catch {
                // Fall through to tiles ErrorState
              }
            }

            setLoading(false);
            setErrorType('tiles');
          }
        });

        if (mode === 'picker' || mode === 'service-area') {
          map.on('click', (e) => {
            const coords = [Number(e.lngLat.lng.toFixed(6)), Number(e.lngLat.lat.toFixed(6))];
            if (markersRef.current.primary) {
              markersRef.current.primary.setLngLat(coords);
            }
            if (onLocationChange) onLocationChange(coords);
          });
        }
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('[BrandMap Init Error]', err?.message || err);
        }
        if (!cancelled) {
          setLoading(false);
          setErrorType(err?.message && /webgl/i.test(err.message) ? 'webgl' : 'tiles');
        }
      }
    })();

    return () => {
      cancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current = {};
    };
  }, [mode, retryCount]);

  // Sync markers, routes, geodesic circle, and auto-fit bounds
  useEffect(() => {
    const map = mapRef.current;
    const maplibregl = maplibreRef.current;
    if (!map || !maplibregl || loading) return;

    // 1. Picker or Service Area single primary draggable marker
    if (mode === 'picker' || mode === 'service-area') {
      const targetCoords = (mode === 'picker' ? customerCoords : center) || DEFAULT_MAP_CENTER.coordinates;
      if (!markersRef.current.primary) {
        const marker = new maplibregl.Marker({
          element: createCustomerMarkerEl(mode === 'service-area' ? 'Service hub center' : 'Selected service location'),
          draggable: true,
        })
          .setLngLat(targetCoords)
          .addTo(map);

        marker.on('dragend', () => {
          const ll = marker.getLngLat();
          const coords = [Number(ll.lng.toFixed(6)), Number(ll.lat.toFixed(6))];
          if (onLocationChange) onLocationChange(coords);
        });
        markersRef.current.primary = marker;
      } else {
        markersRef.current.primary.setLngLat(targetCoords);
      }

      if (mode === 'service-area' && map.getSource('dispatchly-service-area')) {
        map.getSource('dispatchly-service-area').setData(buildGeodesicCirclePolygon(targetCoords, radiusKm || 10));
      }
      return;
    }

    // 2. Delivery dual picker markers
    if (mode === 'delivery-picker') {
      const pCoords = pickupCoords || DEFAULT_MAP_CENTER.coordinates;
      const dCoords = dropoffCoords || DEFAULT_MAP_CENTER.dropoffCoordinates;

      if (!markersRef.current.pickup) {
        const pMarker = new maplibregl.Marker({
          element: createDeliveryPinEl('pickup'),
          draggable: true,
        })
          .setLngLat(pCoords)
          .addTo(map);
        pMarker.on('dragend', () => {
          const ll = pMarker.getLngLat();
          if (onPickupChange) onPickupChange([Number(ll.lng.toFixed(6)), Number(ll.lat.toFixed(6))]);
        });
        markersRef.current.pickup = pMarker;
      } else {
        markersRef.current.pickup.setLngLat(pCoords);
      }

      if (!markersRef.current.dropoff) {
        const dMarker = new maplibregl.Marker({
          element: createDeliveryPinEl('dropoff'),
          draggable: true,
        })
          .setLngLat(dCoords)
          .addTo(map);
        dMarker.on('dragend', () => {
          const ll = dMarker.getLngLat();
          if (onDropoffChange) onDropoffChange([Number(ll.lng.toFixed(6)), Number(ll.lat.toFixed(6))]);
        });
        markersRef.current.dropoff = dMarker;
      } else {
        markersRef.current.dropoff.setLngLat(dCoords);
      }

      if (map.getSource('dispatchly-route-remaining')) {
        map.getSource('dispatchly-route-remaining').setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [pCoords, dCoords] },
        });
      }
      return;
    }

    // 3. Tracking mode (customer tracking & technician active job)
    if (mode === 'tracking') {
      const custPos = customerCoords || DEFAULT_MAP_CENTER.coordinates;
      if (!markersRef.current.customer) {
        markersRef.current.customer = new maplibregl.Marker({
          element: createCustomerMarkerEl('Customer destination'),
        })
          .setLngLat(custPos)
          .addTo(map);
      } else {
        markersRef.current.customer.setLngLat(custPos);
      }

      if (technicianCoords && technicianCoords.length === 2) {
        if (!markersRef.current.technician) {
          markersRef.current.technician = new maplibregl.Marker({
            element: createTechnicianMarkerEl(category, technicianHeading, technicianName || 'Technician'),
          })
            .setLngLat(technicianCoords)
            .addTo(map);
          lastTechPosRef.current = technicianCoords;
        } else {
          // Smoothly animate marker over ~1 second using requestAnimationFrame
          const startPos = lastTechPosRef.current || technicianCoords;
          const endPos = technicianCoords;
          const rotateEl = markersRef.current.technician.getElement()?.querySelector('[data-rotate-wrap="true"]');
          if (rotateEl) {
            rotateEl.style.transform = `rotate(${technicianHeading || 0}deg)`;
          }

          if (startPos[0] !== endPos[0] || startPos[1] !== endPos[1]) {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            const durationMs = 1000;
            const startTime = performance.now();

            const stepAnim = (now) => {
              const t = Math.min(1, (now - startTime) / durationMs);
              const lng = startPos[0] + (endPos[0] - startPos[0]) * t;
              const lat = startPos[1] + (endPos[1] - startPos[1]) * t;
              markersRef.current.technician?.setLngLat([lng, lat]);
              if (t < 1) {
                animFrameRef.current = requestAnimationFrame(stepAnim);
              } else {
                lastTechPosRef.current = endPos;
              }
            };
            animFrameRef.current = requestAnimationFrame(stepAnim);
          }
        }
      }

      // Draw route line (white casing + ink remaining + amber completed)
      const routeCoords =
        routeGeometry?.coordinates?.length >= 2
          ? routeGeometry.coordinates
          : technicianCoords
          ? [technicianCoords, custPos]
          : [];

      if (map.getSource('dispatchly-route-remaining') && map.getSource('dispatchly-route-completed')) {
        if (routeCoords.length >= 2 && technicianCoords) {
          const { completed, remaining } = splitRouteAtPosition(routeCoords, technicianCoords);
          map.getSource('dispatchly-route-remaining').setData({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: remaining.length >= 2 ? remaining : routeCoords },
          });
          map.getSource('dispatchly-route-completed').setData(
            completed.length >= 2
              ? { type: 'Feature', geometry: { type: 'LineString', coordinates: completed } }
              : { type: 'FeatureCollection', features: [] }
          );
        } else {
          map.getSource('dispatchly-route-remaining').setData({ type: 'FeatureCollection', features: [] });
          map.getSource('dispatchly-route-completed').setData({ type: 'FeatureCollection', features: [] });
        }
      }

      // Auto-fit bounds to customer and technician
      if (technicianCoords && custPos) {
        const bounds = new maplibregl.LngLatBounds();
        bounds.extend(custPos);
        bounds.extend(technicianCoords);
        map.fitBounds(bounds, { padding: 64, maxZoom: 15, duration: 500 });
      } else if (custPos) {
        map.easeTo({ center: custPos, zoom: 14, duration: 400 });
      }
    }

    // 4. Admin overview mode
    if (mode === 'admin') {
      Object.values(markersRef.current).forEach((m) => m.remove());
      markersRef.current = {};

      const bounds = new maplibregl.LngLatBounds();
      let hasPoints = false;

      adminMarkers.forEach((item) => {
        if (!Array.isArray(item.coordinates) || item.coordinates.length < 2) return;
        hasPoints = true;
        bounds.extend(item.coordinates);
        const el =
          item.type === 'technician'
            ? createTechnicianMarkerEl(item.category, item.heading || 0, item.label || 'Technician')
            : createCustomerMarkerEl(item.label || 'Booking location');
        if (onAdminMarkerClick) {
          el.style.cursor = 'pointer';
          el.addEventListener('click', () => onAdminMarkerClick(item));
        }
        const marker = new maplibregl.Marker({ element: el }).setLngLat(item.coordinates).addTo(map);
        markersRef.current[item.id] = marker;
      });

      if (routeGeometry?.coordinates?.length >= 2 && map.getSource('dispatchly-route-remaining')) {
        map.getSource('dispatchly-route-remaining').setData({
          type: 'Feature',
          geometry: routeGeometry,
        });
      }

      if (hasPoints) {
        map.fitBounds(bounds, { padding: 56, maxZoom: 14, duration: 400 });
      }
    }
  }, [
    mode,
    loading,
    center,
    customerCoords,
    technicianCoords,
    technicianHeading,
    technicianName,
    category,
    routeGeometry,
    pickupCoords,
    dropoffCoords,
    radiusKm,
    adminMarkers,
  ]);

  const handleMapActivate = () => {
    if (!scrollUnlocked && mapRef.current) {
      mapRef.current.scrollZoom.enable();
      setScrollUnlocked(true);
    }
  };

  const handleZoomIn = () => mapRef.current?.zoomIn({ duration: 250 });
  const handleZoomOut = () => mapRef.current?.zoomOut({ duration: 250 });

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [Number(pos.coords.longitude.toFixed(6)), Number(pos.coords.latitude.toFixed(6))];
        mapRef.current?.easeTo({ center: coords, zoom: 14 });
        if (mode === 'delivery-picker' && onPickupChange) {
          onPickupChange(coords);
        } else if (onLocationChange) {
          onLocationChange(coords);
        }
      },
      () => {
        // Keep current map position if geolocation is declined
      }
    );
  };

  const handlePresetClick = (preset) => {
    mapRef.current?.easeTo({ center: preset.coordinates, zoom: 13 });
    if (mode === 'delivery-picker' && onPickupChange) {
      onPickupChange(preset.coordinates);
    } else if (onLocationChange) {
      onLocationChange(preset.coordinates);
    }
    if (onAddressChange) {
      onAddressChange(preset.address);
    }
  };

  const etaMinutes = eta?.minutes ?? (typeof eta === 'number' ? eta : null);
  const displayDistKm = eta?.distanceKm ?? distanceKm;

  return (
    <div className="space-y-3">
      {/* Editable address & quick Mumbai area presets for picker modes */}
      {(mode === 'picker' || mode === 'delivery-picker') && (showPresets || onAddressChange) && (
        <div className="space-y-2.5">
          {onAddressChange && (
            <input
              type="text"
              value={address || ''}
              onChange={(e) => onAddressChange(e.target.value)}
              placeholder="Enter street address or landmark in Mumbai"
              className="w-full px-3.5 py-2.5 rounded-control border border-line bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 transition"
            />
          )}
          {showPresets && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick area presets">
              {MUMBAI_AREA_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className="px-2.5 py-1 rounded-control border border-line bg-concrete hover:bg-white text-ink text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-1"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Map Frame: 1px line border, 12px radius (rounded-panel), no shadows */}
      <div
        className={`relative w-full ${heightClass} rounded-panel border border-line bg-concrete overflow-hidden`}
        onClick={handleMapActivate}
        onFocus={handleMapActivate}
        tabIndex={0}
        aria-label="Interactive dispatch map"
      >
        <div ref={containerRef} className="w-full h-full" />

        {/* Loading Skeleton */}
        {loading && !mapError && (
          <div className="absolute inset-0 bg-concrete flex flex-col items-center justify-center gap-2 z-20">
            <div className="w-8 h-8 rounded-full border-2 border-ink border-t-amber animate-spin" />
            <span className="text-sm font-medium text-ink/70">Loading map tiles...</span>
          </div>
        )}

        {/* ErrorState with Retry (renders only inside the map area; never blocks form inputs) */}
        {mapError && (
          <div
            role="alert"
            className="absolute inset-0 bg-white flex flex-col items-center justify-center p-6 text-center gap-3 z-20"
          >
            <AlertTriangle className="w-7 h-7 text-status-danger" />
            <div className="space-y-1 max-w-sm">
              <p className="text-sm font-semibold text-ink">
                {errorType === 'webgl' ? 'Map display unavailable' : 'Unable to load map'}
              </p>
              <p className="text-sm text-ink/80">
                {MAP_ERROR_MESSAGES[errorType] || MAP_ERROR_MESSAGES.tiles}
              </p>
            </div>
            {errorType !== 'webgl' && (
              <button
                type="button"
                onClick={() => setRetryCount((c) => c + 1)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control border border-line bg-white hover:bg-concrete text-xs font-semibold text-ink"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}

        {/* Brand-styled Zoom Buttons (consistent top-right corner) */}
        {!mapError && (
          <div className="absolute top-3 right-3 z-10 flex flex-col rounded-control border border-line bg-white overflow-hidden">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleZoomIn();
              }}
              aria-label="Zoom in"
              className="p-2 text-ink hover:bg-concrete border-b border-line transition"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleZoomOut();
              }}
              aria-label="Zoom out"
              className="p-2 text-ink hover:bg-concrete transition"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Picker GPS button */}
        {(mode === 'picker' || mode === 'delivery-picker') && !mapError && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleUseCurrentLocation();
            }}
            className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control border border-line bg-white hover:bg-concrete text-xs font-semibold text-ink transition"
          >
            <Navigation className="w-3.5 h-3.5 text-ink" />
            <span>Use my current location</span>
          </button>
        )}

        {/* Tracking Overlay Card (white panel, >= 14px text) */}
        {mode === 'tracking' && !mapError && (technicianName || etaMinutes != null) && (
          <div className="absolute top-3 left-3 z-10 bg-white border border-line rounded-panel px-3.5 py-2.5 max-w-[260px] space-y-1">
            {technicianName && (
              <div className="text-sm font-bold text-ink truncate">
                {technicianName}
              </div>
            )}
            <div className="text-sm text-ink/80 flex items-center gap-1.5 flex-wrap">
              <span className="capitalize">{category}</span>
              {etaMinutes != null && (
                <>
                  <span>&bull;</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-ink">
                    <Clock className="w-3.5 h-3.5 text-ink" />
                    {etaMinutes} min
                  </span>
                </>
              )}
              {displayDistKm != null && (
                <span>({Number(displayDistKm).toFixed(1)} km)</span>
              )}
            </div>
          </div>
        )}

        {/* Scroll-wheel hint until clicked */}
        {!scrollUnlocked && !loading && !mapError && (
          <div className="absolute bottom-2 left-2 z-10 px-2.5 py-1 rounded-control bg-white/95 border border-line text-xs text-ink/80 pointer-events-none">
            Click map to zoom with scroll
          </div>
        )}
      </div>

      {/* Service Area Radius Slider */}
      {mode === 'service-area' && onRadiusChange && (
        <div className="p-3.5 rounded-panel border border-line bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-sm font-semibold text-ink">
            Coverage radius: {radiusKm} km
          </div>
          <input
            type="range"
            min="3"
            max="35"
            step="1"
            value={radiusKm}
            onChange={(e) => onRadiusChange(Number(e.target.value))}
            aria-label="Service coverage radius in kilometers"
            className="w-full sm:w-56 accent-amber cursor-pointer"
          />
        </div>
      )}
    </div>
  );
}
