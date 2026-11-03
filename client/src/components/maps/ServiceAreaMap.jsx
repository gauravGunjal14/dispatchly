'use client';

import React, { useEffect, useRef } from 'react';

export default function ServiceAreaMap({ center = [-122.4194, 37.7749], radiusKm = 25, onLocationChange }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const L = require('leaflet');

    // Fix default marker icon issue in Leaflet with bundlers
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    if (!mapInstanceRef.current && mapContainerRef.current) {
      // Leaflet uses [lat, lng]
      const lat = center[1];
      const lng = center[0];

      const map = L.map(mapContainerRef.current).setView([lat, lng], 11);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      // Marker
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      markerRef.current = marker;

      // Radius Circle
      const circle = L.circle([lat, lng], {
        radius: radiusKm * 1000,
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(map);
      circleRef.current = circle;

      // Drag listener
      marker.on('dragend', function (e) {
        const position = marker.getLatLng().wrap();
        circle.setLatLng(position);
        if (onLocationChange) {
          onLocationChange([Number(position.lng.toFixed(6)), Number(position.lat.toFixed(6))]);
        }
      });

      // Map click listener
      map.on('click', function (e) {
        const wrapped = e.latlng.wrap();
        marker.setLatLng(wrapped);
        circle.setLatLng(wrapped);
        if (onLocationChange) {
          onLocationChange([Number(wrapped.lng.toFixed(6)), Number(wrapped.lat.toFixed(6))]);
        }
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update circle radius when prop changes
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radiusKm * 1000);
    }
  }, [radiusKm]);

  // Update center position when prop changes externally
  useEffect(() => {
    if (markerRef.current && circleRef.current && mapInstanceRef.current) {
      const lat = center[1];
      const lng = center[0];
      markerRef.current.setLatLng([lat, lng]);
      circleRef.current.setLatLng([lat, lng]);
      mapInstanceRef.current.panTo([lat, lng]);
    }
  }, [center]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-300 shadow-inner">
      <div ref={mapContainerRef} className="w-full h-72 z-0" />
      <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-semibold text-slate-700 shadow border border-slate-200 z-10">
        Click or drag pin to set dispatch headquarters
      </div>
    </div>
  );
}
