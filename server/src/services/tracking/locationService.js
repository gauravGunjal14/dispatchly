/**
 * Technician Location & Live Tracking Service
 * Validates, throttles, persists, and broadcasts live technician coordinates.
 */

const mongoose = require('mongoose');
const TechnicianProfile = require('../../models/TechnicianProfile');
const Booking = require('../../models/Booking');
const { emitToTicket, emitToAdmin } = require('../socketService');
const { checkAndRecalculateEta } = require('./etaService');

// In-memory position store: technicianId -> { coordinates, heading, speed, timestamp, lastUpdateAt, lastDbSaveAt }
const latestPositions = new Map();

/**
 * Validates coordinate ranges.
 * @param {number} lng
 * @param {number} lat
 * @returns {boolean}
 */
const isValidCoordinates = (lng, lat) => {
  return (
    typeof lng === 'number' &&
    typeof lat === 'number' &&
    !isNaN(lng) &&
    !isNaN(lat) &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
};

/**
 * Processes incoming location update from socket or HTTP fallback.
 * @param {object} params
 * @param {string} params.technicianProfileId
 * @param {[number, number]} params.coordinates [longitude, latitude]
 * @param {number} [params.heading]
 * @param {number} [params.speed]
 * @param {Date|number|string} [params.timestamp]
 * @returns {Promise<object>}
 */
const processLocationUpdate = async ({
  technicianProfileId,
  coordinates,
  heading = 0,
  speed = 0,
  timestamp,
}) => {
  if (!technicianProfileId) {
    return { success: false, code: 'MISSING_TECHNICIAN_ID', message: 'Technician ID required' };
  }

  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return { success: false, code: 'INVALID_COORDINATES', message: 'Coordinates must be [lng, lat]' };
  }

  const [lng, lat] = coordinates;
  if (!isValidCoordinates(lng, lat)) {
    return { success: false, code: 'INVALID_COORDINATES', message: 'Coordinates out of valid range (-180..180, -90..90)' };
  }

  const now = Date.now();
  const updateTimestamp = timestamp ? new Date(timestamp).getTime() : now;

  // Reject future timestamps (> 1 min drift) or overly stale timestamps (> 1 hour old)
  if (updateTimestamp > now + 60 * 1000) {
    return { success: false, code: 'FUTURE_TIMESTAMP', message: 'Timestamp is in the future' };
  }
  if (updateTimestamp < now - 3600 * 1000) {
    return { success: false, code: 'STALE_TIMESTAMP', message: 'Timestamp is older than 1 hour' };
  }

  const techKey = technicianProfileId.toString();
  const last = latestPositions.get(techKey);

  // Throttling: reject updates that arrive faster than 3 seconds
  const THROTTLE_INTERVAL_MS = 3000;
  if (last) {
    // Reject out-of-order or duplicate timestamps
    if (updateTimestamp <= last.timestamp) {
      return { success: false, code: 'OUT_OF_ORDER', message: 'Timestamp must be strictly newer than last update' };
    }

    if (now - last.lastUpdateAt < THROTTLE_INTERVAL_MS) {
      return { success: false, code: 'THROTTLED', message: 'Updates throttled to once every 3 seconds' };
    }
  }

  // Update in-memory record
  const currentPos = {
    coordinates: [lng, lat],
    heading: Number(heading) || 0,
    speed: Number(speed) || 0,
    timestamp: updateTimestamp,
    lastUpdateAt: now,
    lastDbSaveAt: last?.lastDbSaveAt || 0,
  };
  latestPositions.set(techKey, currentPos);

  // Database persistence throttling: persist to MongoDB at most once every 15s
  const DB_PERSIST_INTERVAL_MS = 15000;
  if (mongoose.connection.readyState === 1 && now - currentPos.lastDbSaveAt >= DB_PERSIST_INTERVAL_MS) {
    currentPos.lastDbSaveAt = now;
    TechnicianProfile.findByIdAndUpdate(technicianProfileId, {
      $set: {
        currentLocation: {
          type: 'Point',
          coordinates: [lng, lat],
          updatedAt: new Date(updateTimestamp),
        },
      },
    }).catch((err) => console.error('[Location Persistence Error]', err));
  }

  // Find active booking for this technician that is in transit or work
  let activeBooking = null;
  if (mongoose.connection.readyState === 1) {
    activeBooking = await Booking.findOne({
      assignedTechnician: technicianProfileId,
      status: { $in: ['en_route', 'arrived', 'in_progress'] },
    });
  }

  if (activeBooking) {
    // Recalculate ETA if threshold met
    const { eta } = await checkAndRecalculateEta(activeBooking, [lng, lat]);

    // Broadcast live location exclusively to ticket room for customer tracking
    emitToTicket(activeBooking._id, 'technician:location', {
      bookingId: activeBooking._id,
      coordinates: [lng, lat],
      heading: currentPos.heading,
      speed: currentPos.speed,
      eta,
      timestamp: updateTimestamp,
    });
  }

  // Always broadcast to admin operations room for live fleet map
  emitToAdmin('technician:location_update', {
    technicianId: technicianProfileId,
    coordinates: [lng, lat],
    heading: currentPos.heading,
    activeBookingId: activeBooking?._id || null,
    status: activeBooking?.status || 'idle',
    timestamp: updateTimestamp,
  });

  return {
    success: true,
    coordinates: [lng, lat],
    timestamp: updateTimestamp,
    activeBookingId: activeBooking?._id || null,
  };
};

/**
 * Returns the latest in-memory position for a technician.
 * @param {string} technicianProfileId
 * @returns {object|null}
 */
const getLatestPosition = (technicianProfileId) => {
  if (!technicianProfileId) return null;
  return latestPositions.get(technicianProfileId.toString()) || null;
};

module.exports = {
  isValidCoordinates,
  processLocationUpdate,
  getLatestPosition,
};
