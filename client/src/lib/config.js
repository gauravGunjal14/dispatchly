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

export const DEFAULT_CURRENCY = 'USD';

export const CURRENCY_LOCALES = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'en-IE',
  GBP: 'en-GB',
};
