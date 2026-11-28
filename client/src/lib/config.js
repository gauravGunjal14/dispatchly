// Centralized platform configuration constants

export const DEFAULT_MAP_CENTER = {
  lat: 19.0760,
  lng: 72.8777,
  zoom: 12,
  // GeoJSON [lng, lat] order used by backend & map components
  coordinates: [72.8777, 19.0760],
  // Slightly offset secondary point for delivery drop-off defaults
  dropoffCoordinates: [72.8977, 19.0860],
  city: 'Mumbai',
};

export const DEFAULT_CURRENCY = 'INR';

export const DEFAULT_MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/positron';

export const MUMBAI_AREA_PRESETS = [
  { label: 'Andheri West', coordinates: [72.8295, 19.1364], address: 'Andheri West, Link Road, Mumbai 400053' },
  { label: 'Bandra West', coordinates: [72.8300, 19.0596], address: 'Bandra West, Hill Road, Mumbai 400050' },
  { label: 'Powai', coordinates: [72.9060, 19.1176], address: 'Powai, Hiranandani Gardens, Mumbai 400076' },
  { label: 'Dadar', coordinates: [72.8428, 19.0178], address: 'Dadar West, Shivaji Park, Mumbai 400028' },
  { label: 'Thane', coordinates: [72.9781, 19.2183], address: 'Thane West, Ghodbunder Road, Thane 400601' },
  { label: 'Navi Mumbai', coordinates: [73.0297, 19.0330], address: 'Vashi Sector 17, Navi Mumbai 400703' },
];

export const CURRENCY_LOCALES = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'en-IE',
  GBP: 'en-GB',
};
