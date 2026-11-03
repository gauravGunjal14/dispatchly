'use client';

import React, { useEffect, useRef } from 'react';
import { MapPin, Navigation } from 'lucide-react';

export default function LocationPickerMap({
  mode = 'single', // 'single' | 'delivery'
  location = [-122.4194, 37.7749], // [lng, lat]
  pickupLocation = [-122.4194, 37.7749],
  dropoffLocation = [-122.3994, 37.7849],
  onLocationChange,
  onPickupChange,
  onDropoffChange,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const singleMarkerRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const dropoffMarkerRef = useRef(null);
  const polylineRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const L = require('leaflet');

    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    if (!mapInstanceRef.current && mapContainerRef.current) {
      const initialLat = mode === 'delivery' ? pickupLocation[1] : location[1];
      const initialLng = mode === 'delivery' ? pickupLocation[0] : location[0];

      const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], 13);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      if (mode === 'single') {
        const marker = L.marker([location[1], location[0]], { draggable: true }).addTo(map);
        singleMarkerRef.current = marker;

        marker.on('dragend', () => {
          const pos = marker.getLatLng().wrap();
          if (onLocationChange) onLocationChange([Number(pos.lng.toFixed(6)), Number(pos.lat.toFixed(6))]);
        });

        map.on('click', (e) => {
          const wrapped = e.latlng.wrap();
          marker.setLatLng(wrapped);
          if (onLocationChange) onLocationChange([Number(wrapped.lng.toFixed(6)), Number(wrapped.lat.toFixed(6))]);
        });
      } else if (mode === 'delivery') {
        // Pickup marker (Blue)
        const pickupIcon = new L.Icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        });

        const dropoffIcon = new L.Icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        });

        const pMarker = L.marker([pickupLocation[1], pickupLocation[0]], {
          draggable: true,
          icon: pickupIcon,
        })
          .addTo(map)
          .bindPopup('<b>Pickup Location</b>');
        pickupMarkerRef.current = pMarker;

        const dMarker = L.marker([dropoffLocation[1], dropoffLocation[0]], {
          draggable: true,
          icon: dropoffIcon,
        })
          .addTo(map)
          .bindPopup('<b>Drop-off Location</b>');
        dropoffMarkerRef.current = dMarker;

        // Connecting line
        const polyline = L.polyline(
          [
            [pickupLocation[1], pickupLocation[0]],
            [dropoffLocation[1], dropoffLocation[0]],
          ],
          { color: '#2563eb', dashArray: '6, 8', weight: 3 }
        ).addTo(map);
        polylineRef.current = polyline;

        pMarker.on('dragend', () => {
          const pos = pMarker.getLatLng().wrap();
          if (polylineRef.current) {
            polylineRef.current.setLatLngs([
              pos,
              dropoffMarkerRef.current.getLatLng().wrap(),
            ]);
          }
          if (onPickupChange) onPickupChange([Number(pos.lng.toFixed(6)), Number(pos.lat.toFixed(6))]);
        });

        dMarker.on('dragend', () => {
          const pos = dMarker.getLatLng().wrap();
          if (polylineRef.current) {
            polylineRef.current.setLatLngs([
              pickupMarkerRef.current.getLatLng().wrap(),
              pos,
            ]);
          }
          if (onDropoffChange) onDropoffChange([Number(pos.lng.toFixed(6)), Number(pos.lat.toFixed(6))]);
        });
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mode]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 14);
          if (mode === 'single' && singleMarkerRef.current) {
            singleMarkerRef.current.setLatLng([latitude, longitude]);
            if (onLocationChange) onLocationChange([longitude, latitude]);
          } else if (mode === 'delivery' && pickupMarkerRef.current) {
            pickupMarkerRef.current.setLatLng([latitude, longitude]);
            if (polylineRef.current) {
              polylineRef.current.setLatLngs([
                [latitude, longitude],
                dropoffMarkerRef.current.getLatLng(),
              ]);
            }
            if (onPickupChange) onPickupChange([longitude, latitude]);
          }
        }
      },
      () => {
        alert('Could not retrieve current location. Defaulting to San Francisco.');
      }
    );
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-300 shadow-sm">
      <div ref={mapContainerRef} className="w-full h-72 z-0" />

      {/* Geolocation Button */}
      <button
        type="button"
        onClick={handleUseCurrentLocation}
        className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-md border border-slate-200 text-xs font-bold text-slate-700 hover:text-blue-600 flex items-center space-x-1.5 z-10 transition"
      >
        <Navigation className="w-3.5 h-3.5 text-blue-600" />
        <span>Use My GPS Location</span>
      </button>

      <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-semibold text-slate-600 shadow border border-slate-200 z-10">
        {mode === 'delivery' ? (
          <span>Drag 🔵 Blue (Pickup) & 🟢 Green (Dropoff) pins</span>
        ) : (
          <span>Click map or drag pin to position service address</span>
        )}
      </div>
    </div>
  );
}
