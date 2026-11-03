/**
 * Dispatch Offer Service
 * Manages the sequential offer lifecycle: creation, atomic acceptance, rejection, and expiry.
 */

const Booking = require('../../models/Booking');
const DispatchOffer = require('../../models/DispatchOffer');
const TechnicianProfile = require('../../models/TechnicianProfile');
const InventoryItem = require('../../models/InventoryItem');
const PlatformSettings = require('../../models/PlatformSettings');
const { filterCandidates } = require('./eligibilityFilter');
const { getRouteEstimate } = require('./travelTimeService');
const { scoreCandidate } = require('./scorer');
const { rankCandidates } = require('./rankingService');
const { emitToUser, emitToTicket, emitToAdmin } = require('../socketService');

/**
 * Masks a phone number so customer privacy is protected until job offer acceptance.
 * e.g. "+1-415-555-0199" -> "***-***-0199"
 * @param {string} phone
 * @returns {string}
 */
const maskPhoneNumber = (phone) => {
  if (!phone) return '***-***-****';
  const clean = String(phone).replace(/\s+/g, '');
  if (clean.length <= 4) return '***-***-****';
  return '***-***-' + clean.slice(-4);
};

/**
 * Initiates the dispatch engine for a booking.
 * @param {string} bookingId
 * @returns {Promise<object>}
 */
const startDispatch = async (bookingId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    const error = new Error(`Booking ${bookingId} not found`);
    error.statusCode = 404;
    throw error;
  }

  if (['assigned', 'en_route', 'arrived', 'in_progress', 'completed'].includes(booking.status)) {
    return { status: 'already_assigned', booking };
  }

  booking.status = 'searching';
  booking.dispatch = booking.dispatch || {};
  booking.dispatch.state = 'searching';
  booking.dispatchHistory.push({
    event: 'started',
    at: new Date(),
    meta: { initiatedAt: new Date().toISOString() },
  });
  await booking.save();

  emitToTicket(booking._id, 'booking:status', {
    bookingId: booking._id,
    status: 'searching',
    ticketNumber: booking.ticketNumber,
  });
  emitToAdmin('dispatch:update', {
    bookingId: booking._id,
    state: 'searching',
  });

  return createNextOffer(booking._id);
};

/**
 * Evaluates candidates, picks the top ranked candidate, and creates a sequential dispatch offer.
 * @param {string} bookingId
 * @returns {Promise<object>}
 */
const createNextOffer = async (bookingId) => {
  const booking = await Booking.findById(bookingId).populate('customer service');
  if (!booking) {
    return { status: 'not_found' };
  }

  if (['assigned', 'completed', 'cancelled'].includes(booking.status)) {
    return { status: 'already_terminal', booking };
  }

  const settings = await PlatformSettings.getSettings();
  const currentAttempts = booking.dispatch?.attempts || 0;
  const maxAttempts = settings.maxOfferAttempts || 5;

  if (currentAttempts >= maxAttempts) {
    booking.dispatch.state = 'exhausted';
    booking.status = 'failed';
    booking.dispatchHistory.push({
      event: 'exhausted',
      at: new Date(),
      meta: {
        reason: 'Maximum offer attempts reached without acceptance',
        attempts: currentAttempts,
        maxAttempts,
      },
    });
    await booking.save();

    emitToTicket(booking._id, 'booking:status', {
      bookingId: booking._id,
      status: 'failed',
      ticketNumber: booking.ticketNumber,
    });
    emitToAdmin('dispatch:update', {
      bookingId: booking._id,
      state: 'exhausted',
      status: 'failed',
    });

    return { status: 'exhausted', booking };
  }

  // Find all active, approved, available technicians
  const technicians = await TechnicianProfile.find({
    verificationStatus: 'approved',
    isAvailable: true,
  }).populate('user');

  const { eligible, rejected } = await filterCandidates(technicians, booking, settings);

  if (eligible.length === 0) {
    booking.dispatch.state = 'exhausted';
    booking.status = 'failed';
    booking.dispatchHistory.push({
      event: 'exhausted',
      at: new Date(),
      meta: {
        reason: 'No eligible candidates available matching criteria',
        rejectedCount: rejected.length,
        rejectedSummary: rejected.map((r) => ({
          technicianId: r.technician._id,
          reason: r.reason,
          code: r.code,
        })),
      },
    });
    await booking.save();

    emitToTicket(booking._id, 'booking:status', {
      bookingId: booking._id,
      status: 'failed',
      ticketNumber: booking.ticketNumber,
    });
    emitToAdmin('dispatch:update', {
      bookingId: booking._id,
      state: 'exhausted',
      status: 'failed',
      rejectedCount: rejected.length,
    });

    return { status: 'exhausted', booking, rejectedCandidates: rejected };
  }

  // Pre-fetch inventories for eligible technicians if parts are required
  const techInventories = new Map();
  const requiredParts = booking.requirementSnapshot?.requiredParts || [];
  if (booking.category !== 'delivery' && requiredParts.length > 0) {
    const items = await InventoryItem.find({
      technician: { $in: eligible.map((t) => t._id) },
    });
    for (const item of items) {
      const k = item.technician.toString();
      if (!techInventories.has(k)) techInventories.set(k, []);
      techInventories.get(k).push(item);
    }
  }

  // Calculate route and score each eligible candidate
  const scoredCandidates = [];
  for (const tech of eligible) {
    const routeInfo = await getRouteEstimate(
      tech.currentLocation.coordinates,
      booking.location.coordinates,
      settings.avgSpeedKmh || 30
    );

    const scored = scoreCandidate({
      technician: tech,
      booking,
      routeInfo,
      inventoryItems: techInventories.get(tech._id.toString()) || [],
      settings,
    });

    scoredCandidates.push({
      technician: tech,
      ...scored,
    });
  }

  const rankedCandidates = rankCandidates(scoredCandidates);
  const topCandidate = rankedCandidates[0];

  const nextAttempt = currentAttempts + 1;
  const expirySeconds = settings.offerExpirySeconds || 60;
  const expiresAt = new Date(Date.now() + expirySeconds * 1000);

  // Create the sequential DispatchOffer document
  const offer = await DispatchOffer.create({
    booking: booking._id,
    technician: topCandidate.technician._id,
    attempt: nextAttempt,
    rank: 1,
    totalScore: topCandidate.totalScore,
    scoreBreakdown: topCandidate.scoreBreakdown,
    etaMinutes: topCandidate.etaMinutes,
    distanceKm: topCandidate.distanceKm,
    status: 'pending',
    expiresAt,
  });

  // Update Booking state
  booking.status = 'offered';
  booking.dispatch.state = 'awaiting_response';
  booking.dispatch.attempts = nextAttempt;
  booking.dispatch.currentOffer = offer._id;
  booking.dispatchHistory.push({
    event: 'offered',
    technician: topCandidate.technician._id,
    at: new Date(),
    meta: {
      offerId: offer._id,
      attempt: nextAttempt,
      totalScore: topCandidate.totalScore,
      etaMinutes: topCandidate.etaMinutes,
      distanceKm: topCandidate.distanceKm,
      scoreBreakdown: topCandidate.scoreBreakdown,
    },
  });
  await booking.save();

  // Send real-time offer event to candidate technician with masked phone
  const techUserId = topCandidate.technician.user?._id || topCandidate.technician.user;
  emitToUser(techUserId, 'offer:new', {
    offerId: offer._id,
    bookingId: booking._id,
    ticketNumber: booking.ticketNumber,
    category: booking.category,
    description: booking.description,
    priority: booking.priority,
    location: booking.location,
    maskedPhone: maskPhoneNumber(booking.contactPhone),
    pricing: booking.pricing,
    distanceKm: topCandidate.distanceKm,
    etaMinutes: topCandidate.etaMinutes,
    expiresAt: offer.expiresAt,
    totalScore: topCandidate.totalScore,
    scoreBreakdown: topCandidate.scoreBreakdown,
  });

  // Notify customer & admin
  emitToTicket(booking._id, 'booking:status', {
    bookingId: booking._id,
    status: 'offered',
    ticketNumber: booking.ticketNumber,
    attempt: nextAttempt,
  });

  emitToAdmin('dispatch:update', {
    bookingId: booking._id,
    offerId: offer._id,
    state: 'awaiting_response',
    attempt: nextAttempt,
    candidate: {
      technicianId: topCandidate.technician._id,
      name: topCandidate.technician.user?.name,
      totalScore: topCandidate.totalScore,
      etaMinutes: topCandidate.etaMinutes,
    },
  });

  return {
    status: 'offered',
    offer,
    booking,
    candidateScores: rankedCandidates,
    rejectedCandidates: rejected,
  };
};

/**
 * Race-safe atomic acceptance of an offer by a technician.
 * Reserves required inventory parts and transitions booking to assigned.
 * @param {string} offerId
 * @param {string} technicianProfileId
 * @returns {Promise<object>}
 */
const acceptOffer = async (offerId, technicianProfileId) => {
  const now = new Date();

  // 1. Atomic offer state check and transition
  const offer = await DispatchOffer.findOneAndUpdate(
    {
      _id: offerId,
      technician: technicianProfileId,
      status: 'pending',
      expiresAt: { $gt: now },
    },
    {
      $set: {
        status: 'accepted',
        respondedAt: now,
      },
    },
    { new: true }
  );

  if (!offer) {
    const existing = await DispatchOffer.findById(offerId);
    if (!existing) {
      const err = new Error('Offer not found');
      err.statusCode = 404;
      throw err;
    }
    if (existing.status !== 'pending' || existing.expiresAt <= now) {
      const err = new Error('Offer has expired or is no longer available');
      err.statusCode = 409;
      err.code = 'OFFER_EXPIRED';
      throw err;
    }
    const err = new Error('Offer does not belong to this technician');
    err.statusCode = 403;
    throw err;
  }

  // 2. Atomic booking assignment
  const booking = await Booking.findOneAndUpdate(
    {
      _id: offer.booking,
      status: { $in: ['offered', 'searching'] },
    },
    {
      $set: {
        status: 'assigned',
        assignedTechnician: technicianProfileId,
        assignedAt: now,
        'dispatch.state': 'assigned',
      },
      $push: {
        dispatchHistory: {
          event: 'accepted',
          technician: technicianProfileId,
          at: now,
          meta: { offerId, attempt: offer.attempt },
        },
        statusHistory: {
          status: 'assigned',
          at: now,
          note: 'Technician accepted dispatch offer',
        },
      },
    },
    { new: true }
  ).populate('customer service assignedTechnician');

  if (!booking) {
    // Rollback offer if booking was somehow cancelled concurrently
    await DispatchOffer.findByIdAndUpdate(offerId, { $set: { status: 'cancelled' } });
    const err = new Error('Booking is no longer available for assignment');
    err.statusCode = 409;
    throw err;
  }

  // 3. Reserve inventory parts atomically (Plumbing / HVAC)
  const requiredParts = booking.requirementSnapshot?.requiredParts || [];
  const reservations = [];

  if (booking.category !== 'delivery' && requiredParts.length > 0) {
    try {
      for (const reqPart of requiredParts) {
        const item = await InventoryItem.findOne({
          technician: technicianProfileId,
          $or: [
            { partCode: reqPart.partCode },
            { name: reqPart.name || reqPart.partCode },
          ],
        });

        if (!item) {
          throw new Error(`Inventory item '${reqPart.partCode || reqPart.name}' not found for technician`);
        }

        const needed = reqPart.quantity || 1;
        // Atomic increment reserving the quantity only if sufficient unreserved stock exists
        const updated = await InventoryItem.findOneAndUpdate(
          {
            _id: item._id,
            $expr: {
              $gte: [{ $subtract: ['$quantity', '$reservedQuantity'] }, needed],
            },
          },
          { $inc: { reservedQuantity: needed } },
          { new: true }
        );

        if (!updated) {
          throw new Error(`Insufficient unreserved inventory for '${reqPart.partCode}'`);
        }

        reservations.push({
          item: updated._id,
          partCode: reqPart.partCode || item.partCode,
          quantity: needed,
        });
      }

      booking.inventoryReservations = reservations;
      await booking.save();
    } catch (invErr) {
      // Rollback any successfully reserved parts in this loop
      for (const res of reservations) {
        await InventoryItem.findByIdAndUpdate(res.item, {
          $inc: { reservedQuantity: -res.quantity },
        });
      }

      // Revert booking assignment and offer
      await Booking.findByIdAndUpdate(booking._id, {
        $set: {
          status: 'searching',
          assignedTechnician: null,
          assignedAt: null,
          'dispatch.state': 'searching',
        },
      });

      await DispatchOffer.findByIdAndUpdate(offerId, {
        $set: {
          status: 'rejected',
          rejectReason: `Inventory reservation failed: ${invErr.message}`,
        },
      });

      const err = new Error(`Inventory reservation error: ${invErr.message}`);
      err.statusCode = 409;
      throw err;
    }
  }

  // 4. Increment technician active job count
  await TechnicianProfile.findByIdAndUpdate(technicianProfileId, {
    $inc: { activeJobCount: 1 },
  });

  // 5. Emit real-time events with unmasked customer details to technician
  const techProfile = await TechnicianProfile.findById(technicianProfileId).populate('user');
  const techUserId = techProfile?.user?._id || techProfile?.user;

  emitToUser(techUserId, 'offer:accepted', {
    offerId,
    bookingId: booking._id,
    ticketNumber: booking.ticketNumber,
    contactPhone: booking.contactPhone, // Full unmasked phone
    customer: booking.customer,
    location: booking.location,
    status: 'assigned',
  });

  emitToTicket(booking._id, 'booking:assigned', {
    bookingId: booking._id,
    status: 'assigned',
    technician: {
      id: techProfile?._id,
      name: techProfile?.user?.name,
      rating: techProfile?.rating,
      vehicleType: techProfile?.vehicleType,
    },
    assignedAt: now,
  });

  emitToAdmin('dispatch:assigned', {
    bookingId: booking._id,
    technicianId: technicianProfileId,
    offerId,
  });

  return { success: true, booking, offer };
};

/**
 * Rejects a dispatch offer and immediately attempts to offer to the next eligible candidate.
 * @param {string} offerId
 * @param {string} technicianProfileId
 * @param {string} reason
 * @returns {Promise<object>}
 */
const rejectOffer = async (offerId, technicianProfileId, reason = '') => {
  const now = new Date();

  const offer = await DispatchOffer.findOneAndUpdate(
    {
      _id: offerId,
      technician: technicianProfileId,
      status: 'pending',
    },
    {
      $set: {
        status: 'rejected',
        respondedAt: now,
        rejectReason: reason || 'Declined by technician',
      },
    },
    { new: true }
  );

  if (!offer) {
    const err = new Error('Offer not found or not in pending state');
    err.statusCode = 400;
    throw err;
  }

  // Exclude this technician and reset state to searching
  const booking = await Booking.findByIdAndUpdate(
    offer.booking,
    {
      $addToSet: { 'dispatch.excludedTechnicians': technicianProfileId },
      $set: {
        status: 'searching',
        'dispatch.state': 'searching',
        'dispatch.currentOffer': null,
      },
      $push: {
        dispatchHistory: {
          event: 'rejected',
          technician: technicianProfileId,
          at: now,
          meta: { offerId, reason },
        },
      },
    },
    { new: true }
  );

  emitToAdmin('dispatch:offer_rejected', {
    bookingId: offer.booking,
    technicianId: technicianProfileId,
    offerId,
    reason,
  });

  // Automatically evaluate and dispatch to the next candidate
  const nextResult = await createNextOffer(offer.booking);
  return { success: true, offer, nextResult };
};

/**
 * Sweeper function that marks all expired pending offers and triggers next candidate dispatch.
 * @returns {Promise<number>} Number of expired offers processed
 */
const expireOffers = async () => {
  const now = new Date();

  const expiredOffers = await DispatchOffer.find({
    status: 'pending',
    expiresAt: { $lte: now },
  }).populate('booking');

  if (expiredOffers.length === 0) {
    return 0;
  }

  for (const offer of expiredOffers) {
    await DispatchOffer.findByIdAndUpdate(offer._id, {
      $set: { status: 'expired', respondedAt: now },
    });

    const techProfile = await TechnicianProfile.findById(offer.technician);
    if (techProfile) {
      emitToUser(techProfile.user, 'offer:expired', {
        offerId: offer._id,
        bookingId: offer.booking?._id,
      });
    }

    if (offer.booking && !['assigned', 'completed', 'cancelled'].includes(offer.booking.status)) {
      await Booking.findByIdAndUpdate(offer.booking._id, {
        $addToSet: { 'dispatch.excludedTechnicians': offer.technician },
        $set: {
          status: 'searching',
          'dispatch.state': 'searching',
          'dispatch.currentOffer': null,
        },
        $push: {
          dispatchHistory: {
            event: 'expired',
            technician: offer.technician,
            at: now,
            meta: { offerId: offer._id, attempt: offer.attempt },
          },
        },
      });

      // Proceed to the next candidate
      await createNextOffer(offer.booking._id);
    }
  }

  return expiredOffers.length;
};

module.exports = {
  maskPhoneNumber,
  startDispatch,
  createNextOffer,
  acceptOffer,
  rejectOffer,
  expireOffers,
};
