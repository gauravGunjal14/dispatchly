/**
 * ETA Service
 * Computes dynamic ETA and travel distance for active bookings.
 *
 * NOTE: The public OSRM routing API provides baseline geometric routing with speed limits,
 * but does NOT incorporate real-time traffic congestion. This service abstracts route estimation
 * behind an interface so traffic-aware providers (e.g. Google Distance Matrix, Mapbox Directions)
 * can be plugged in without changing the application logic.
 */

const mongoose = require('mongoose');
const { getRouteEstimate, haversineDistanceKm } = require('../dispatch/travelTimeService');
const { emitToTicket } = require('../socketService');
const PlatformSettings = require('../../models/PlatformSettings');

// In-memory cache of last ETA calculation parameters per booking
const lastEtaCache = new Map();

/**
 * Checks whether technician has moved > 200m or > 30s have passed, and recalculates ETA if so.
 * @param {object} booking Mongoose Booking document
 * @param {[number, number]} technicianCoords [longitude, latitude]
 * @returns {Promise<{ updated: boolean, eta: object }>}
 */
const checkAndRecalculateEta = async (booking, technicianCoords) => {
  if (!booking || !technicianCoords || !booking.location?.coordinates) {
    return { updated: false, eta: booking?.eta };
  }

  const bookingId = booking._id.toString();
  const now = Date.now();
  const cached = lastEtaCache.get(bookingId);

  // Thresholds: 200 meters or 30 seconds
  const DISTANCE_THRESHOLD_KM = 0.2; // 200 meters
  const TIME_THRESHOLD_MS = 30 * 1000; // 30 seconds

  if (cached) {
    const movedKm = haversineDistanceKm(cached.coordinates, technicianCoords);
    const timeElapsedMs = now - cached.timestamp;

    if (movedKm < DISTANCE_THRESHOLD_KM && timeElapsedMs < TIME_THRESHOLD_MS) {
      return { updated: false, eta: booking.eta };
    }
  }

  try {
    let settings = { avgSpeedKmh: 30 };
    if (mongoose.connection.readyState === 1) {
      settings = await PlatformSettings.getSettings();
    }
    const routeInfo = await getRouteEstimate(
      technicianCoords,
      booking.location.coordinates,
      settings.avgSpeedKmh || 30
    );

    const etaData = {
      minutes: routeInfo.etaMinutes,
      distanceKm: routeInfo.distanceKm,
      updatedAt: new Date(now),
    };

    booking.eta = etaData;
    if (typeof booking.save === 'function' && mongoose.connection.readyState === 1) {
      await booking.save();
    }

    lastEtaCache.set(bookingId, {
      coordinates: technicianCoords,
      timestamp: now,
    });

    emitToTicket(booking._id, 'booking:eta', {
      bookingId: booking._id,
      eta: etaData,
    });

    return { updated: true, eta: etaData };
  } catch (err) {
    console.error(`[ETA Service Error] Failed to update ETA for booking ${bookingId}:`, err);
    return { updated: false, eta: booking.eta };
  }
};

/**
 * Clears the in-memory ETA cache for a booking when completed or cancelled.
 * @param {string} bookingId
 */
const clearBookingEtaCache = (bookingId) => {
  if (bookingId) {
    lastEtaCache.delete(bookingId.toString());
  }
};

module.exports = {
  checkAndRecalculateEta,
  clearBookingEtaCache,
};
