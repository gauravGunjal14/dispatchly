/**
 * Requirement Analysis Service
 * Normalizes booking parameters into an evaluation payload for the Phase 4 dispatch engine.
 * @param {Object} booking - Booking document with requirementSnapshot and location details
 * @returns {Object} Normalized requirement profile
 */
const extractBookingRequirements = (booking) => {
  if (!booking) {
    throw new Error('Booking object is required for requirement analysis');
  }

  const snapshot = booking.requirementSnapshot || {};
  const isDelivery = booking.category === 'delivery';

  const requiredSkills = snapshot.requiredSkills || [];
  const requiredParts = (snapshot.requiredParts || []).map((p) => ({
    partCode: p.partCode.toUpperCase(),
    name: p.name,
    quantity: p.quantity || 1,
  }));

  const vehicleRequirements = {
    allowedVehicleTypes: snapshot.allowedVehicleTypes || (isDelivery ? ['car', 'van', 'pickup', 'motorcycle'] : []),
    minPackageCapacityKg: snapshot.minPackageCapacityKg || booking.packageWeightKg || 0,
  };

  // Primary dispatch location: for delivery it is the pickup location, for on-site services it is the customer location
  const serviceCoordinates = isDelivery
    ? booking.pickupLocation?.coordinates || booking.location?.coordinates
    : booking.location?.coordinates;

  const deadline =
    booking.sla?.arrivalDeadline || booking.deliveryDeadline || new Date(Date.now() + 60 * 60 * 1000);

  return {
    bookingId: booking._id,
    ticketNumber: booking.ticketNumber,
    category: booking.category,
    priority: booking.priority || 'normal',
    serviceCoordinates,
    requiredSkills,
    requiredParts,
    vehicleRequirements,
    deadline,
    estimatedDurationMin: snapshot.estimatedDurationMin || 60,
  };
};

module.exports = {
  extractBookingRequirements,
};
