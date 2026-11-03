/**
 * Eligibility Filter
 * Evaluates candidate technicians against strict hard rules.
 * A high score can never bypass an eligibility rule.
 */

const { haversineDistanceKm } = require('./travelTimeService');
const InventoryItem = require('../../models/InventoryItem');

/**
 * Checks if current time is within technician's configured working hours.
 * @param {object} workingHours { start: '08:00', end: '18:00', days: ['Mon', 'Tue', ...] }
 * @param {Date} now
 * @returns {boolean}
 */
const isWithinWorkingHours = (workingHours, now = new Date()) => {
  if (!workingHours || !workingHours.days || workingHours.days.length === 0) {
    return true; // No restriction configured
  }

  const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentDay = daysMap[now.getDay()];

  if (!workingHours.days.includes(currentDay)) {
    return false;
  }

  if (workingHours.start && workingHours.end) {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = workingHours.start.split(':').map(Number);
    const [endH, endM] = workingHours.end.split(':').map(Number);
    const startMinutes = startH * 60 + (startM || 0);
    const endMinutes = endH * 60 + (endM || 0);

    if (startMinutes <= endMinutes) {
      if (currentMinutes < startMinutes || currentMinutes > endMinutes) return false;
    } else {
      // Overnight shift
      if (currentMinutes < startMinutes && currentMinutes > endMinutes) return false;
    }
  }

  return true;
};

/**
 * Filters a list of technician profiles against a booking and platform settings.
 * @param {Array} technicians List of TechnicianProfile documents (with user populated if available)
 * @param {object} booking Booking document
 * @param {object} settings PlatformSettings document
 * @returns {Promise<{ eligible: Array, rejected: Array }>}
 */
const filterCandidates = async (technicians, booking, settings) => {
  const eligible = [];
  const rejected = [];

  const maxCandidateRadiusKm = settings?.maxCandidateRadiusKm || 25;
  const locationStaleMinutes = settings?.locationStaleMinutes || 10;
  const maxActiveJobs = settings?.workloadMaxActiveJobs || 3;
  const now = new Date();

  const excludedIds = new Set(
    (booking.dispatch?.excludedTechnicians || []).map((id) => id.toString())
  );

  const reqSnapshot = booking.requirementSnapshot || {};
  const requiredSkills = (reqSnapshot.requiredSkills || []).map((s) => s.toLowerCase().trim());
  const requiredParts = reqSnapshot.requiredParts || [];

  // Batch query inventory for all candidate technicians if parts are required
  let technicianInventories = new Map();
  if (booking.category !== 'delivery' && requiredParts.length > 0 && technicians.length > 0) {
    const techIds = technicians.map((t) => t._id);
    const items = await InventoryItem.find({ technician: { $in: techIds } });
    for (const item of items) {
      const techKey = item.technician.toString();
      if (!technicianInventories.has(techKey)) {
        technicianInventories.set(techKey, []);
      }
      technicianInventories.get(techKey).push(item);
    }
  }

  for (const tech of technicians) {
    const techId = tech._id.toString();

    // 1. Excluded / already offered check
    if (excludedIds.has(techId)) {
      rejected.push({
        technician: tech,
        reason: 'Technician already evaluated or rejected this booking',
        code: 'EXCLUDED',
      });
      continue;
    }

    // 2. Account verification & availability
    if (tech.verificationStatus !== 'approved') {
      rejected.push({
        technician: tech,
        reason: 'Technician verification is not approved',
        code: 'UNAPPROVED',
      });
      continue;
    }

    if (!tech.isAvailable) {
      rejected.push({
        technician: tech,
        reason: 'Technician availability is currently set to offline',
        code: 'UNAVAILABLE',
      });
      continue;
    }

    if (tech.user && tech.user.status && tech.user.status !== 'active') {
      rejected.push({
        technician: tech,
        reason: 'Technician account is not active',
        code: 'ACCOUNT_INACTIVE',
      });
      continue;
    }

    // 3. Category match
    if (!tech.serviceCategories || !tech.serviceCategories.includes(booking.category)) {
      rejected.push({
        technician: tech,
        reason: `Technician does not service ${booking.category}`,
        code: 'CATEGORY_MISMATCH',
      });
      continue;
    }

    // 4. Skills match
    if (requiredSkills.length > 0) {
      const techSkills = (tech.skills || []).map((s) => s.toLowerCase().trim());
      const missingSkills = requiredSkills.filter((req) => !techSkills.includes(req));
      if (missingSkills.length > 0) {
        rejected.push({
          technician: tech,
          reason: `Missing required skills: ${missingSkills.join(', ')}`,
          code: 'SKILLS_MISSING',
        });
        continue;
      }
    }

    // 5. Service Area check
    if (!booking.location || !booking.location.coordinates) {
      rejected.push({
        technician: tech,
        reason: 'Booking location coordinates are missing',
        code: 'LOCATION_MISSING',
      });
      continue;
    }

    const bookingCoords = booking.location.coordinates; // [lng, lat]
    const serviceCenter = tech.serviceArea?.center?.coordinates || [-122.4194, 37.7749];
    const serviceRadiusKm = tech.serviceArea?.radiusKm || 25;
    const distanceToServiceCenter = haversineDistanceKm(serviceCenter, bookingCoords);

    if (distanceToServiceCenter > serviceRadiusKm) {
      rejected.push({
        technician: tech,
        reason: `Booking location (${distanceToServiceCenter.toFixed(1)} km) is outside technician service area (${serviceRadiusKm} km)`,
        code: 'OUTSIDE_SERVICE_AREA',
      });
      continue;
    }

    // 6. Current Location & Distance Cap
    const currentCoords = tech.currentLocation?.coordinates;
    if (!currentCoords || currentCoords.length < 2) {
      rejected.push({
        technician: tech,
        reason: 'Technician current location coordinates are missing',
        code: 'CURRENT_LOCATION_MISSING',
      });
      continue;
    }

    const distanceToBooking = haversineDistanceKm(currentCoords, bookingCoords);
    if (distanceToBooking > maxCandidateRadiusKm) {
      rejected.push({
        technician: tech,
        reason: `Technician distance (${distanceToBooking.toFixed(1)} km) exceeds maximum search radius (${maxCandidateRadiusKm} km)`,
        code: 'EXCEEDS_MAX_RADIUS',
      });
      continue;
    }

    // 7. Location Freshness check
    const lastLocUpdate = tech.currentLocation?.updatedAt ? new Date(tech.currentLocation.updatedAt) : null;
    if (!lastLocUpdate || now.getTime() - lastLocUpdate.getTime() > locationStaleMinutes * 60 * 1000) {
      const ageMin = lastLocUpdate ? Math.round((now.getTime() - lastLocUpdate.getTime()) / 60000) : 'unknown';
      rejected.push({
        technician: tech,
        reason: `Technician location is stale (${ageMin} min ago; max allowed is ${locationStaleMinutes} min)`,
        code: 'LOCATION_STALE',
      });
      continue;
    }

    // 8. Working Hours check
    if (!isWithinWorkingHours(tech.workingHours, now)) {
      rejected.push({
        technician: tech,
        reason: 'Outside technician configured working hours',
        code: 'OUTSIDE_WORKING_HOURS',
      });
      continue;
    }

    // 9. Workload capacity
    if ((tech.activeJobCount || 0) >= maxActiveJobs) {
      rejected.push({
        technician: tech,
        reason: `Technician active job capacity reached (${tech.activeJobCount}/${maxActiveJobs})`,
        code: 'WORKLOAD_EXCEEDED',
      });
      continue;
    }

    // 10. Spare Parts Check (Plumbing / HVAC)
    if (booking.category !== 'delivery' && requiredParts.length > 0) {
      const techInventory = technicianInventories.get(techId) || [];
      let missingParts = [];

      for (const reqPart of requiredParts) {
        const item = techInventory.find(
          (inv) =>
            (inv.partCode && inv.partCode.toLowerCase() === reqPart.partCode?.toLowerCase()) ||
            (inv.name && inv.name.toLowerCase() === (reqPart.name || reqPart.partCode)?.toLowerCase())
        );

        const available = item ? (item.quantity || 0) - (item.reservedQuantity || 0) : 0;
        if (available < reqPart.quantity) {
          missingParts.push(
            `${reqPart.name || reqPart.partCode} (needed ${reqPart.quantity}, available ${available})`
          );
        }
      }

      if (missingParts.length > 0) {
        rejected.push({
          technician: tech,
          reason: `Insufficient inventory: ${missingParts.join('; ')}`,
          code: 'PARTS_INSUFFICIENT',
        });
        continue;
      }
    }

    // 11. Delivery Vehicle & Capacity Check
    if (booking.category === 'delivery') {
      const allowedVehicles = reqSnapshot.allowedVehicleTypes || [];
      if (allowedVehicles.length > 0 && (!tech.vehicleType || !allowedVehicles.includes(tech.vehicleType))) {
        rejected.push({
          technician: tech,
          reason: `Vehicle '${tech.vehicleType || 'none'}' is not among allowed types: ${allowedVehicles.join(', ')}`,
          code: 'VEHICLE_TYPE_NOT_ALLOWED',
        });
        continue;
      }

      const requiredWeight = booking.packageWeightKg || reqSnapshot.minPackageCapacityKg || 0;
      if ((tech.packageCapacityKg || 0) < requiredWeight) {
        rejected.push({
          technician: tech,
          reason: `Package weight (${requiredWeight} kg) exceeds technician capacity (${tech.packageCapacityKg || 0} kg)`,
          code: 'PACKAGE_CAPACITY_INSUFFICIENT',
        });
        continue;
      }
    }

    // All hard rules satisfied!
    eligible.push(tech);
  }

  return { eligible, rejected };
};

module.exports = {
  isWithinWorkingHours,
  filterCandidates,
};
