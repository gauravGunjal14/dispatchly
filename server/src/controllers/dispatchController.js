/**
 * Dispatch Controller
 * Handles technician offer actions (view, accept, reject), active jobs, and admin dispatch monitoring.
 */

const DispatchOffer = require('../models/DispatchOffer');
const Booking = require('../models/Booking');
const TechnicianProfile = require('../models/TechnicianProfile');
const ReassignmentRequest = require('../models/ReassignmentRequest');
const PlatformSettings = require('../models/PlatformSettings');
const Quote = require('../models/Quote');
const { validateTransition } = require('../services/booking/stateMachine');
const { emitToTicket, emitToAdmin } = require('../services/socketService');
const { createNotification } = require('../services/notificationService');
const { processLocationUpdate } = require('../services/tracking/locationService');
const {
  maskPhoneNumber,
  acceptOffer,
  rejectOffer,
  startDispatch,
  cancelJobByTechnician,
  decideReassignment,
  manualAssign,
} = require('../services/dispatch');
const { filterCandidates } = require('../services/dispatch/eligibilityFilter');
const { getRouteEstimate } = require('../services/dispatch/travelTimeService');
const { scoreCandidate } = require('../services/dispatch/scorer');
const { rankCandidates } = require('../services/dispatch/rankingService');

// 1. Technician: Get pending offers with masked customer phone numbers
const getMyOffers = async (req, res, next) => {
  try {
    const profile = await TechnicianProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROFILE_NOT_FOUND', message: 'Technician profile not found' },
      });
    }

    const now = new Date();
    const offers = await DispatchOffer.find({
      technician: profile._id,
      status: 'pending',
      expiresAt: { $gt: now },
    })
      .populate('booking')
      .sort({ createdAt: -1 });

    const formatted = offers.map((offer) => {
      const b = offer.booking;
      return {
        _id: offer._id,
        attempt: offer.attempt,
        rank: offer.rank,
        totalScore: offer.totalScore,
        scoreBreakdown: offer.scoreBreakdown,
        etaMinutes: offer.etaMinutes,
        distanceKm: offer.distanceKm,
        status: offer.status,
        expiresAt: offer.expiresAt,
        createdAt: offer.createdAt,
        booking: b
          ? {
              _id: b._id,
              ticketNumber: b.ticketNumber,
              category: b.category,
              description: b.description,
              priority: b.priority,
              location: b.location,
              maskedPhone: maskPhoneNumber(b.contactPhone),
              pricing: b.pricing,
              packageWeightKg: b.packageWeightKg,
              requirementSnapshot: b.requirementSnapshot,
            }
          : null,
      };
    });

    return res.json({
      success: true,
      data: {
        offers: formatted,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 2. Technician: Accept an offer (atomic + race-safe)
const acceptMyOffer = async (req, res, next) => {
  try {
    const profile = await TechnicianProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROFILE_NOT_FOUND', message: 'Technician profile not found' },
      });
    }

    const result = await acceptOffer(req.params.id, profile._id);

    return res.json({
      success: true,
      data: result,
      message: 'Offer accepted successfully. Job is now assigned to you.',
    });
  } catch (error) {
    next(error);
  }
};

// 3. Technician: Reject an offer
const rejectMyOffer = async (req, res, next) => {
  try {
    const profile = await TechnicianProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROFILE_NOT_FOUND', message: 'Technician profile not found' },
      });
    }

    const { reason } = req.body;
    const result = await rejectOffer(req.params.id, profile._id, reason);

    return res.json({
      success: true,
      data: result,
      message: 'Offer declined.',
    });
  } catch (error) {
    next(error);
  }
};

// 4. Technician: Get current assigned job (with full unmasked customer details)
const getCurrentJob = async (req, res, next) => {
  try {
    const profile = await TechnicianProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROFILE_NOT_FOUND', message: 'Technician profile not found' },
      });
    }

    const job = await Booking.findOne({
      assignedTechnician: profile._id,
      status: { $in: ['assigned', 'en_route', 'arrived', 'in_progress'] },
    }).populate('customer service');

    return res.json({
      success: true,
      data: { job },
    });
  } catch (error) {
    next(error);
  }
};

// 5. Technician: Cancel job or request reassignment
const cancelJob = async (req, res, next) => {
  try {
    const profile = await TechnicianProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROFILE_NOT_FOUND', message: 'Technician profile not found' },
      });
    }

    const { reason } = req.body;
    const result = await cancelJobByTechnician(req.params.bookingId, profile._id, reason);

    return res.json({
      success: true,
      data: result,
      message: result.cancelled
        ? 'Job cancelled and reassignment initiated'
        : 'Reassignment request submitted for dispatcher approval',
    });
  } catch (error) {
    next(error);
  }
};

// 6. Technician: Location update (supports latitude/longitude or coordinates [lng, lat], throttled)
const patchLocation = async (req, res, next) => {
  try {
    const profile = await TechnicianProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROFILE_NOT_FOUND', message: 'Technician profile not found' },
      });
    }

    let lat = req.body.latitude;
    let lng = req.body.longitude;

    if (Array.isArray(req.body.coordinates) && req.body.coordinates.length === 2) {
      lng = req.body.coordinates[0];
      lat = req.body.coordinates[1];
    }

    const result = await processLocationUpdate({
      technicianProfileId: profile._id,
      coordinates: [lng, lat],
      heading: req.body.heading,
      speed: req.body.speed,
      timestamp: req.body.timestamp || new Date(),
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { code: result.code, message: result.message },
      });
    }

    return res.json({
      success: true,
      data: {
        currentLocation: {
          type: 'Point',
          coordinates: result.coordinates,
          updatedAt: new Date(result.timestamp),
        },
        activeBookingId: result.activeBookingId,
      },
      message: 'Location updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// 6b. Technician: Job status updates (en_route -> arrived -> in_progress)
const updateJobStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const profile = await TechnicianProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROFILE_NOT_FOUND', message: 'Technician profile not found' },
      });
    }

    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found' },
      });
    }

    // Ownership check: must be assigned technician
    if (!booking.assignedTechnician || booking.assignedTechnician.toString() !== profile._id.toString()) {
      return res.status(403).json({
        success: false,
        error: { code: 'UNAUTHORIZED_JOB', message: 'You are not the assigned technician for this booking' },
      });
    }

    // Validate state machine transition
    validateTransition(booking.status, status);

    // If starting work ('in_progress') and quotation is required, block until quote approved
    if (status === 'in_progress' && (booking.pricing?.quotationRequired || booking.pricing?.type === 'quotation')) {
      const approvedQuote = await Quote.findOne({ booking: booking._id, status: 'approved' });
      if (!approvedQuote) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'QUOTE_NOT_APPROVED',
            message: 'Cannot start work: a formal quotation must be submitted and approved by the customer first.',
          },
        });
      }
    }

    const now = new Date();
    // Milestone timestamps
    if (status === 'en_route') booking.enRouteAt = now;
    if (status === 'arrived') booking.arrivedAt = now;
    if (status === 'in_progress') booking.startedAt = now;

    booking.status = status;
    booking.statusHistory.push({
      status,
      at: now,
      by: req.user._id,
      note: note || `Technician marked status as ${status}`,
    });

    await booking.save();

    // Broadcast real-time updates
    emitToTicket(booking._id, 'booking:status', {
      bookingId: booking._id,
      status,
      ticketNumber: booking.ticketNumber,
      at: now,
    });

    emitToAdmin('dispatch:status_update', {
      bookingId: booking._id,
      technicianId: profile._id,
      status,
      ticketNumber: booking.ticketNumber,
      at: now,
    });

    // Notify customer
    await createNotification({
      userId: booking.customer,
      type: `status_${status}`,
      title: `Technician Status: ${status.replace('_', ' ').toUpperCase()}`,
      body: `Your technician is now ${status.replace('_', ' ')} for ticket #${booking.ticketNumber}`,
      data: { bookingId: booking._id, status },
    });

    return res.json({
      success: true,
      data: { booking },
      message: `Job status updated to ${status}`,
    });
  } catch (error) {
    next(error);
  }
};

// 7. Admin: Dispatch Monitor
const getDispatchMonitor = async (req, res, next) => {
  try {
    const activeDispatches = await Booking.find({
      status: { $in: ['searching', 'offered', 'assigned', 'en_route', 'arrived', 'in_progress', 'failed'] },
    })
      .populate('customer service assignedTechnician')
      .populate({
        path: 'dispatch.currentOffer',
        populate: { path: 'technician', populate: { path: 'user' } },
      })
      .sort({ createdAt: -1 })
      .limit(100);

    const pendingReassignments = await ReassignmentRequest.countDocuments({ status: 'pending' });

    return res.json({
      success: true,
      data: {
        bookings: activeDispatches,
        stats: {
          totalActive: activeDispatches.length,
          searching: activeDispatches.filter((b) => b.status === 'searching').length,
          offered: activeDispatches.filter((b) => b.status === 'offered').length,
          assigned: activeDispatches.filter((b) => b.status === 'assigned').length,
          inTransit: activeDispatches.filter((b) => ['en_route', 'arrived'].includes(b.status)).length,
          inProgress: activeDispatches.filter((b) => b.status === 'in_progress').length,
          failed: activeDispatches.filter((b) => b.status === 'failed').length,
          pendingReassignments,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// 8. Admin: Candidate breakdown & dispatch diagnostic for a booking
const getBookingDispatchDetail = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate('customer service assignedTechnician')
      .populate({
        path: 'dispatch.currentOffer',
        populate: { path: 'technician', populate: { path: 'user' } },
      });

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found' },
      });
    }

    const settings = await PlatformSettings.getSettings();

    // Re-evaluate eligible vs rejected candidates for full dispatcher visibility
    const technicians = await TechnicianProfile.find({}).populate('user');
    const { eligible, rejected } = await filterCandidates(technicians, booking, settings);

    // Calculate simulated scores for all eligible candidates
    const scoredEligible = [];
    for (const tech of eligible) {
      const routeInfo = await getRouteEstimate(
        tech.currentLocation?.coordinates || [-122.4194, 37.7749],
        booking.location?.coordinates || [-122.4194, 37.7749],
        settings.avgSpeedKmh || 30
      );

      const scored = scoreCandidate({
        technician: tech,
        booking,
        routeInfo,
        settings,
      });

      scoredEligible.push({
        technician: {
          _id: tech._id,
          name: tech.user?.name,
          email: tech.user?.email,
          rating: tech.rating,
          reliabilityScore: tech.reliabilityScore,
          activeJobCount: tech.activeJobCount,
          currentLocation: tech.currentLocation,
        },
        ...scored,
      });
    }

    const ranked = rankCandidates(scoredEligible);

    // Get offer history
    const offers = await DispatchOffer.find({ booking: booking._id })
      .populate({ path: 'technician', populate: { path: 'user' } })
      .sort({ attempt: 1 });

    return res.json({
      success: true,
      data: {
        booking,
        settings: {
          weights: settings.dispatchWeights,
          maxAttempts: settings.maxOfferAttempts,
          maxRadiusKm: settings.maxCandidateRadiusKm,
          staleMinutes: settings.locationStaleMinutes,
        },
        rankedEligibleCandidates: ranked,
        rejectedCandidates: rejected.map((r) => ({
          technician: {
            _id: r.technician._id,
            name: r.technician.user?.name,
            email: r.technician.user?.email,
            verificationStatus: r.technician.verificationStatus,
            isAvailable: r.technician.isAvailable,
          },
          reason: r.reason,
          code: r.code,
        })),
        offers,
        dispatchHistory: booking.dispatchHistory || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

// 9. Admin: Manual Assignment Override
const manualAssignBooking = async (req, res, next) => {
  try {
    const { technicianId, adminNote } = req.body;
    if (!technicianId) {
      return res.status(400).json({
        success: false,
        error: { code: 'TECHNICIAN_ID_REQUIRED', message: 'Technician ID is required for manual assignment' },
      });
    }

    const result = await manualAssign(req.params.bookingId, technicianId, req.user._id, adminNote);

    return res.json({
      success: true,
      data: result,
      message: 'Technician manually assigned to booking',
    });
  } catch (error) {
    next(error);
  }
};

// 10. Admin: Retry / Re-dispatch Booking
const retryDispatchBooking = async (req, res, next) => {
  try {
    const { clearExclusions } = req.body;
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found' },
      });
    }

    if (clearExclusions) {
      booking.dispatch.excludedTechnicians = [];
    }
    booking.dispatch.attempts = 0;
    booking.status = 'searching';
    booking.dispatch.state = 'searching';
    booking.dispatch.currentOffer = null;
    booking.dispatchHistory.push({
      event: 'admin_retry',
      at: new Date(),
      meta: { by: req.user._id, clearExclusions: Boolean(clearExclusions) },
    });
    await booking.save();

    const result = await startDispatch(booking._id);

    return res.json({
      success: true,
      data: result,
      message: 'Dispatch retried successfully',
    });
  } catch (error) {
    next(error);
  }
};

// 11. Admin: List Reassignment Requests
const listReassignments = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const requests = await ReassignmentRequest.find(filter)
      .populate('booking')
      .populate({ path: 'technician', populate: { path: 'user' } })
      .populate('decidedBy', 'name email')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: { requests },
    });
  } catch (error) {
    next(error);
  }
};

// 12. Admin: Decide Reassignment Request
const decideReassignmentRequest = async (req, res, next) => {
  try {
    const { decision, decisionNote } = req.body;
    if (!['approved', 'denied'].includes(decision)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DECISION', message: "Decision must be 'approved' or 'denied'" },
      });
    }

    const result = await decideReassignment(
      req.params.id,
      req.user._id,
      decision,
      decisionNote
    );

    return res.json({
      success: true,
      data: result,
      message: `Reassignment request ${decision}`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyOffers,
  acceptMyOffer,
  rejectMyOffer,
  getCurrentJob,
  updateJobStatus,
  cancelJob,
  patchLocation,
  getDispatchMonitor,
  getBookingDispatchDetail,
  manualAssignBooking,
  retryDispatchBooking,
  listReassignments,
  decideReassignmentRequest,
};
