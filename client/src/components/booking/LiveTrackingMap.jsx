'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Navigation, Clock, ShieldCheck, MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Dynamic Leaflet container to prevent SSR window is not defined error
const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then((m) => m.Polyline), { ssr: false });

export default function LiveTrackingMap({
  customerCoords,
  technicianCoords,
  eta,
  technicianName = 'Technician',
  status = 'en_route',
}) {
  const [mounted, setMounted] = useState(false);
  const [L, setL] = useState(null);

  useEffect(() => {
    setMounted(true);
    import('leaflet').then((leaflet) => {
      setL(leaflet.default || leaflet);
    });
  }, []);

  if (!mounted || !L || !customerCoords) {
    return (
      <div className="h-72 w-full bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 text-xs">
        Initializing Live Fleet Tracking Map...
      </div>
    );
  }

  // Custom SVG Markers
  const customerIcon = L.divIcon({
    className: 'custom-customer-icon',
    html: `
      <div style="background-color: #2563eb; color: white; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border: 2px solid white;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });

  const technicianIcon = L.divIcon({
    className: 'custom-tech-icon',
    html: `
      <div style="background-color: #10b981; color: white; border-radius: 50%; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(16,185,129,0.5); border: 2px solid white; animation: pulse 2s infinite;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -20],
  });

  // Center coordinate
  const centerLat = technicianCoords ? (customerCoords[1] + technicianCoords[1]) / 2 : customerCoords[1];
  const centerLng = technicianCoords ? (customerCoords[0] + technicianCoords[0]) / 2 : customerCoords[0];

  const polylineCoords = technicianCoords
    ? [
        [technicianCoords[1], technicianCoords[0]],
        [customerCoords[1], customerCoords[0]],
      ]
    : [];

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm h-80 w-full z-0">
      {/* Live ETA Floating Badge */}
      {eta && eta.minutes != null && ['en_route', 'arrived'].includes(status) && (
        <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-lg border border-slate-200 flex items-center space-x-3">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
            <Navigation className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Live Estimated Arrival</div>
            <div className="text-base font-black text-slate-900 leading-tight">
              {eta.minutes} min <span className="text-xs font-semibold text-slate-500">({eta.distanceKm} km)</span>
            </div>
          </div>
        </div>
      )}

      <MapContainer
        center={[centerLat, centerLng]}
        zoom={technicianCoords ? 14 : 15}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Customer Destination Marker */}
        <Marker position={[customerCoords[1], customerCoords[0]]} icon={customerIcon}>
          <Popup>
            <div className="text-xs font-bold text-slate-900">Service Destination</div>
          </Popup>
        </Marker>

        {/* Technician Live Marker (only shown when available) */}
        {technicianCoords && (
          <Marker position={[technicianCoords[1], technicianCoords[0]]} icon={technicianIcon}>
            <Popup>
              <div className="text-xs">
                <span className="font-bold text-slate-900">{technicianName}</span>
                <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Live On-Duty Position</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Polyline Route */}
        {polylineCoords.length === 2 && (
          <Polyline
            positions={polylineCoords}
            pathOptions={{ color: '#2563eb', weight: 4, dashArray: '8, 8', opacity: 0.8 }}
          />
        )}
      </MapContainer>
    </div>
  );
}
