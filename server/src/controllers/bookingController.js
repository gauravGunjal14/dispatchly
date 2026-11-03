const Booking = require('../models/Booking');
const ServiceCatalog = require('../models/ServiceCatalog');
const PlatformSettings = require('../models/PlatformSettings');
const { calculateEstimate } = require('../services/booking/pricingEstimator');
const { validateTransition, canTransition } = require('../services/booking/stateMachine');
const { startDispatch } = require('../services/dispatch');

// Calculate Pricing Estimate (no booking created)
const getEstimate = async (req, res, next) => {
  try {
    const { serviceId, priority, pickupLocation, dropoffLocation } = req.body;

    const service = await ServiceCatalog.findById(serviceId);
    if (!service || !service.isActive) {
      return res.status(404).json({
        success: false,
        error: { code: 'SERVICE_NOT_FOUND', message: 'Requested service is inactive or not found' },
      });
    }

    const platformSettings = await PlatformSettings.getSettings();

    const estimate = calculateEstimate({
      service,
      priority: priority || 'normal',
      pickupLocation,
      dropoffLocation,
      platformSettings,
    });

    return res.json({
      success: true,
      data: { estimate },
    });
  } catch (error) {
    next(error);
  }
};

// Create / Confirm Booking (Idempotent)
const createBooking = async (req, res, next) => {
  try {
    const {
      serviceId,
      description,
      priority = 'normal',
      contactPhone,
      location,
      pickupLocation,
      dropoffLocation,
      packageWeightKg,
      packageDescription,
      deliveryDeadline,
      idempotencyKey,
    } = req.body;

    // 1. Idempotency Check: Return existing booking if double-submitted with same key
    const existing = await Booking.findOne({
      customer: req.user._id,
      idempotencyKey,
    }).populate('service');

    if (existing) {
      return res.status(200).json({
        success: true,
        data: { booking: existing },
        message: 'Existing booking returned (idempotent submission)',
        idempotent: true,
      });
    }

    // 2. Validate Service Availability
    const service = await ServiceCatalog.findById(serviceId);
    if (!service || !service.isActive) {
      return res.status(400).json({
        success: false,
        error: { code: 'SERVICE_INACTIVE', message: 'Selected service is currently inactive and cannot be booked' },
      });
    }

    // 3. Compute Pricing & SLA Deadlines
    const settings = await PlatformSettings.getSettings();

    const pricing = calculateEstimate({
      service,
      priority,
      pickupLocation,
      dropoffLocation,
      platformSettings: settings,
    });

    // SLA computation
    const catSla = settings.slaTargets?.[service.category]?.[priority] || {
      responseMinutes: 30,
      arrivalMinutes: 120,
      completionMinutes: 240,
    };

    const now = new Date();
    const sla = {
      responseDeadline: new Date(now.getTime() + catSla.responseMinutes * 60000),
      arrivalDeadline: new Date(now.getTime() + catSla.arrivalMinutes * 60000),
      completionDeadline: new Date(now.getTime() + catSla.completionMinutes * 60000),
    };

    // 4. Freeze service requirements snapshot
    const requirementSnapshot = {
      serviceCode: service.code,
      serviceName: service.name,
      estimatedDurationMin: service.estimatedDurationMin,
      requiredSkills: service.requirements?.requiredSkills || [],
      requiredParts: service.requirements?.requiredParts || [],
      allowedVehicleTypes: service.requirements?.allowedVehicleTypes || [],
      minPackageCapacityKg: service.requirements?.minPackageCapacityKg || 0,
    };

    // 5. Create Booking Document
    const booking = new Booking({
      customer: req.user._id,
      service: service._id,
      category: service.category,
      description,
      priority,
      contactPhone,
      location,
      pickupLocation,
      dropoffLocation,
      packageWeightKg: packageWeightKg || 0,
      packageDescription: packageDescription || '',
      deliveryDeadline: deliveryDeadline ? new Date(deliveryDeadline) : undefined,
      requirementSnapshot,
      pricing,
      sla,
      status: 'searching',
      statusHistory: [
        {
          status: 'searching',
          at: now,
          by: req.user._id,
          note: 'Booking requested by customer. Matchmaking engine initiated.',
        },
      ],
      idempotencyKey,
    });

    await booking.save();
    await booking.populate('service');

    // 6. Real-time broadcast to customer & admin dispatch
    if (req.io) {
      req.io.to(`user:${req.user._id}`).emit('booking:status', {
        ticketNumber: booking.ticketNumber,
        bookingId: booking._id,
        status: booking.status,
        sla: booking.sla,
      });

      req.io.to('admin:dispatch').emit('admin:new_ticket', {
        ticketNumber: booking.ticketNumber,
        bookingId: booking._id,
        category: booking.category,
        priority: booking.priority,
      });
    }

    // 7. Trigger placeholder dispatch engine (implemented in Phase 4)
    startDispatch(booking._id).catch((err) => console.error('[Dispatch Trigger Error]', err));

    return res.status(201).json({
      success: true,
      data: { booking },
      message: 'Booking confirmed! Searching for eligible technicians.',
    });
  } catch (error) {
    next(error);
  }
};

// Customer: List own bookings
const getMyBookings = async (req, res, next) => {
  try {
    const { status, category, page = 1, limit = 15 } = req.query;

    const query = { customer: req.user._id };
    if (status) query.status = status;
    if (category) query.category = category.toLowerCase();

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('service', 'name code category pricingType')
        .populate({
          path: 'assignedTechnician',
          populate: { path: 'user', select: 'name phone avatar' },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Booking.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          total,
          page: parseInt(page, 10),
          pages: Math.ceil(total / parseInt(limit, 10)),
          limit: parseInt(limit, 10),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Customer: Get single booking detail
const getMyBookingDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findOne({ _id: id, customer: req.user._id })
      .populate('service')
      .populate({
        path: 'assignedTechnician',
        populate: { path: 'user', select: 'name phone avatar' },
      });

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found or unauthorized' },
      });
    }

    return res.json({
      success: true,
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

// Customer: Cancel Booking
const cancelMyBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findOne({ _id: id, customer: req.user._id });
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found' },
      });
    }

    // Cancellation check: Only allowed before assignment
    if (!['draft', 'searching', 'offered'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_CANCEL',
          message: `Cannot cancel booking once in '${booking.status}' status. Please contact dispatcher support.`,
        },
      });
    }

    validateTransition(booking.status, 'cancelled');

    booking.status = 'cancelled';
    booking.cancellationReason = reason || 'Cancelled by customer';
    booking.statusHistory.push({
      status: 'cancelled',
      at: new Date(),
      by: req.user._id,
      note: reason || 'Customer requested cancellation',
    });

    await booking.save();

    if (req.io) {
      req.io.to(`user:${req.user._id}`).emit('booking:status', {
        bookingId: booking._id,
        status: 'cancelled',
        reason: booking.cancellationReason,
      });
      req.io.to('admin:dispatch').emit('ticket:cancelled', {
        bookingId: booking._id,
        ticketNumber: booking.ticketNumber,
      });
    }

    return res.json({
      success: true,
      data: { booking },
      message: 'Booking cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Admin: List all bookings
const adminListBookings = async (req, res, next) => {
  try {
    const { status, category, priority, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (category) query.category = category.toLowerCase();
    if (priority) query.priority = priority;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('customer', 'name email phone')
        .populate('service', 'name code category')
        .populate({
          path: 'assignedTechnician',
          populate: { path: 'user', select: 'name phone' },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Booking.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          total,
          page: parseInt(page, 10),
          pages: Math.ceil(total / parseInt(limit, 10)),
          limit: parseInt(limit, 10),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Get booking detail
const adminGetBookingDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id)
      .populate('customer', 'name email phone avatar')
      .populate('service')
      .populate({
        path: 'assignedTechnician',
        populate: { path: 'user', select: 'name phone avatar' },
      })
      .populate('statusHistory.by', 'name role');

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found' },
      });
    }

    return res.json({
      success: true,
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEstimate,
  createBooking,
  getMyBookings,
  getMyBookingDetail,
  cancelMyBooking,
  adminListBookings,
  adminGetBookingDetail,
};
