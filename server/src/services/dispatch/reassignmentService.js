/**
 * Reassignment Service
 * Handles technician cancellations, dispatcher reassignment approvals, and manual overrides.
 */

const Booking = require('../../models/Booking');
const DispatchOffer = require('../../models/DispatchOffer');
const TechnicianProfile = require('../../models/TechnicianProfile');
const InventoryItem = require('../../models/InventoryItem');
const ReassignmentRequest = require('../../models/ReassignmentRequest');
const AuditLog = require('../../models/AuditLog');
const { createNextOffer } = require('./offerService');
const { emitToUser, emitToTicket, emitToAdmin } = require('../socketService');

/**
 * Technician cancels or requests reassignment for an assigned booking.
 * @param {string} bookingId
 * @param {string} technicianProfileId
 * @param {string} reason
 * @returns {Promise<object>}
 */
const cancelJobByTechnician = async (bookingId, technicianProfileId, reason = '') => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }

  if (booking.assignedTechnician?.toString() !== technicianProfileId.toString()) {
    const err = new Error('Technician is not assigned to this booking');
    err.statusCode = 403;
    throw err;
  }

  if (['completed', 'cancelled'].includes(booking.status)) {
    const err = new Error(`Cannot cancel a job with status '${booking.status}'`);
    err.statusCode = 400;
    throw err;
  }

  // Pre-travel state ('assigned'): technician can release booking directly
  if (booking.status === 'assigned') {
    // 1. Release inventory reservations
    if (booking.inventoryReservations && booking.inventoryReservations.length > 0) {
      for (const res of booking.inventoryReservations) {
        await InventoryItem.findByIdAndUpdate(res.item, {
          $inc: { reservedQuantity: -res.quantity },
        });
      }
      booking.inventoryReservations = [];
    }

    // 2. Decrement active job count
    await TechnicianProfile.findByIdAndUpdate(technicianProfileId, {
      $inc: { activeJobCount: -1 },
    });

    // 3. Mark current offer as cancelled
    if (booking.dispatch?.currentOffer) {
      await DispatchOffer.findByIdAndUpdate(booking.dispatch.currentOffer, {
        $set: { status: 'cancelled' },
      });
    }

    // 4. Update booking state and exclude this technician from future offers on this ticket
    booking.status = 'searching';
    booking.assignedTechnician = null;
    booking.assignedAt = null;
    booking.dispatch.state = 'searching';
    booking.dispatch.currentOffer = null;
    if (!booking.dispatch.excludedTechnicians.includes(technicianProfileId)) {
      booking.dispatch.excludedTechnicians.push(technicianProfileId);
    }
    booking.dispatchHistory.push({
      event: 'cancelled_by_technician',
      technician: technicianProfileId,
      at: new Date(),
      meta: { reason },
    });
    booking.statusHistory.push({
      status: 'searching',
      at: new Date(),
      note: `Technician released booking prior to travel. Reason: ${reason}`,
    });
    await booking.save();

    emitToTicket(booking._id, 'booking:status', {
      bookingId: booking._id,
      status: 'searching',
      ticketNumber: booking.ticketNumber,
      message: 'Technician reassignment in progress',
    });

    emitToAdmin('dispatch:technician_cancelled', {
      bookingId: booking._id,
      technicianId: technicianProfileId,
      reason,
    });

    // Automatically trigger dispatch to the next candidate
    const nextResult = await createNextOffer(booking._id);
    return {
      cancelled: true,
      requiresAdminApproval: false,
      booking,
      nextResult,
    };
  }

  // Active travel / service states ('en_route', 'arrived', 'in_progress'):
  // Unilateral cancellation blocked; creates formal reassignment request for admin review
  const request = await ReassignmentRequest.create({
    booking: booking._id,
    technician: technicianProfileId,
    reason: reason || 'Technician requested reassignment during active job',
    status: 'pending',
  });

  emitToAdmin('dispatch:reassignment_requested', {
    requestId: request._id,
    bookingId: booking._id,
    ticketNumber: booking.ticketNumber,
    technicianId: technicianProfileId,
    reason,
  });

  return {
    cancelled: false,
    requiresAdminApproval: true,
    reassignmentRequest: request,
    message: 'Reassignment request submitted for dispatcher approval because travel or work has commenced',
  };
};

/**
 * Dispatcher decides on an active reassignment request.
 * @param {string} requestId
 * @param {string} adminUserId
 * @param {'approved' | 'denied'} decision
 * @param {string} decisionNote
 * @returns {Promise<object>}
 */
const decideReassignment = async (requestId, adminUserId, decision, decisionNote = '') => {
  const request = await ReassignmentRequest.findById(requestId);
  if (!request) {
    const err = new Error('Reassignment request not found');
    err.statusCode = 404;
    throw err;
  }

  if (request.status !== 'pending') {
    const err = new Error(`Request has already been decided (${request.status})`);
    err.statusCode = 400;
    throw err;
  }

  request.status = decision;
  request.decidedBy = adminUserId;
  request.decidedAt = new Date();
  request.decisionNote = decisionNote;
  await request.save();

  const booking = await Booking.findById(request.booking);

  await AuditLog.create({
    user: adminUserId,
    action: `REASSIGNMENT_${decision.toUpperCase()}`,
    targetModel: 'ReassignmentRequest',
    targetId: request._id,
    changes: {
      bookingId: request.booking,
      technicianId: request.technician,
      decision,
      decisionNote,
    },
  });

  if (decision === 'approved' && booking) {
    // Release previous technician's reservations
    if (booking.inventoryReservations && booking.inventoryReservations.length > 0) {
      for (const res of booking.inventoryReservations) {
        await InventoryItem.findByIdAndUpdate(res.item, {
          $inc: { reservedQuantity: -res.quantity },
        });
      }
      booking.inventoryReservations = [];
    }

    // Decrement previous technician active job count
    await TechnicianProfile.findByIdAndUpdate(request.technician, {
      $inc: { activeJobCount: -1 },
    });

    // Reset booking back to searching
    booking.status = 'searching';
    booking.assignedTechnician = null;
    booking.assignedAt = null;
    booking.dispatch.state = 'searching';
    booking.dispatch.currentOffer = null;
    if (!booking.dispatch.excludedTechnicians.includes(request.technician)) {
      booking.dispatch.excludedTechnicians.push(request.technician);
    }
    booking.dispatchHistory.push({
      event: 'reassigned_by_admin',
      technician: request.technician,
      at: new Date(),
      meta: { decidedBy: adminUserId, decisionNote },
    });
    booking.statusHistory.push({
      status: 'searching',
      at: new Date(),
      by: adminUserId,
      note: `Admin approved reassignment request: ${decisionNote || 'No note provided'}`,
    });
    await booking.save();

    emitToTicket(booking._id, 'booking:status', {
      bookingId: booking._id,
      status: 'searching',
      ticketNumber: booking.ticketNumber,
      message: 'Dispatcher approved reassignment. Searching for next technician.',
    });

    // Auto-dispatch next offer
    const nextResult = await createNextOffer(booking._id);
    return { request, booking, nextResult };
  }

  // Denied
  const techProfile = await TechnicianProfile.findById(request.technician);
  if (techProfile) {
    emitToUser(techProfile.user, 'reassignment:denied', {
      requestId: request._id,
      bookingId: booking?._id,
      decisionNote,
    });
  }

  return { request, booking };
};

/**
 * Dispatcher manual assignment override to any specific approved technician.
 * @param {string} bookingId
 * @param {string} technicianProfileId
 * @param {string} adminUserId
 * @param {string} adminNote
 * @returns {Promise<object>}
 */
const manualAssign = async (bookingId, technicianProfileId, adminUserId, adminNote = '') => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }

  const tech = await TechnicianProfile.findById(technicianProfileId).populate('user');
  if (!tech) {
    const err = new Error('Technician profile not found');
    err.statusCode = 404;
    throw err;
  }

  if (tech.verificationStatus !== 'approved') {
    const err = new Error('Cannot assign to an unverified technician');
    err.statusCode = 400;
    throw err;
  }

  // 1. Supersede any pending offers for this booking
  await DispatchOffer.updateMany(
    { booking: bookingId, status: 'pending' },
    { $set: { status: 'superseded', respondedAt: new Date() } }
  );

  // 2. If previously assigned to another technician, clean up
  if (booking.assignedTechnician && booking.assignedTechnician.toString() !== technicianProfileId.toString()) {
    if (booking.inventoryReservations && booking.inventoryReservations.length > 0) {
      for (const res of booking.inventoryReservations) {
        await InventoryItem.findByIdAndUpdate(res.item, {
          $inc: { reservedQuantity: -res.quantity },
        });
      }
      booking.inventoryReservations = [];
    }
    await TechnicianProfile.findByIdAndUpdate(booking.assignedTechnician, {
      $inc: { activeJobCount: -1 },
    });
  }

  // 3. Attempt inventory reservation for new technician (warn if unavailable)
  const requiredParts = booking.requirementSnapshot?.requiredParts || [];
  const reservations = [];
  if (booking.category !== 'delivery' && requiredParts.length > 0) {
    for (const reqPart of requiredParts) {
      const item = await InventoryItem.findOne({
        technician: technicianProfileId,
        $or: [{ partCode: reqPart.partCode }, { name: reqPart.name || reqPart.partCode }],
      });
      if (item && item.quantity - item.reservedQuantity >= (reqPart.quantity || 1)) {
        await InventoryItem.findByIdAndUpdate(item._id, {
          $inc: { reservedQuantity: reqPart.quantity || 1 },
        });
        reservations.push({
          item: item._id,
          partCode: reqPart.partCode || item.partCode,
          quantity: reqPart.quantity || 1,
        });
      }
    }
  }

  // 4. Update booking
  const now = new Date();
  booking.status = 'assigned';
  booking.assignedTechnician = technicianProfileId;
  booking.assignedAt = now;
  booking.inventoryReservations = reservations;
  booking.dispatch.state = 'manual';
  booking.dispatch.currentOffer = null;
  booking.dispatchHistory.push({
    event: 'manual_override',
    technician: technicianProfileId,
    at: now,
    meta: {
      decidedBy: adminUserId,
      adminNote,
      partsReserved: reservations.length,
      partsRequired: requiredParts.length,
    },
  });
  booking.statusHistory.push({
    status: 'assigned',
    at: now,
    by: adminUserId,
    note: `Dispatcher manual override assignment. Note: ${adminNote || 'None'}`,
  });
  await booking.save();

  // 5. Increment technician active jobs
  await TechnicianProfile.findByIdAndUpdate(technicianProfileId, {
    $inc: { activeJobCount: 1 },
  });

  // 6. Audit Log
  await AuditLog.create({
    user: adminUserId,
    action: 'DISPATCH_MANUAL_OVERRIDE',
    targetModel: 'Booking',
    targetId: booking._id,
    changes: {
      technicianId: technicianProfileId,
      adminNote,
    },
  });

  // 7. Real-time notifications
  emitToUser(tech.user?._id || tech.user, 'job:assigned', {
    bookingId: booking._id,
    ticketNumber: booking.ticketNumber,
    contactPhone: booking.contactPhone,
    customer: booking.customer,
    location: booking.location,
    manualOverride: true,
  });

  emitToTicket(booking._id, 'booking:assigned', {
    bookingId: booking._id,
    status: 'assigned',
    technician: {
      id: tech._id,
      name: tech.user?.name,
      rating: tech.rating,
      vehicleType: tech.vehicleType,
    },
    assignedAt: now,
  });

  emitToAdmin('dispatch:assigned', {
    bookingId: booking._id,
    technicianId: technicianProfileId,
    type: 'manual_override',
  });

  return { success: true, booking };
};

module.exports = {
  cancelJobByTechnician,
  decideReassignment,
  manualAssign,
};
