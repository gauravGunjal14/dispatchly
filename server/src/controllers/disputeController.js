const Dispute = require('../models/Dispute');
const Booking = require('../models/Booking');
const paymentService = require('../services/payment/paymentService');
const notificationService = require('../services/notificationService');
const { getIO } = require('../services/socketService');

const listDisputes = async (req, res, next) => {
  try {
    const { status = 'open', page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [disputes, total] = await Promise.all([
      Dispute.find(filter)
        .populate({
          path: 'booking',
          populate: [
            { path: 'customer', select: 'name email phone' },
            { path: 'assignedTechnician', populate: { path: 'user', select: 'name phone' } },
          ],
        })
        .populate('raisedBy', 'name email role')
        .populate('resolvedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Dispute.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        disputes,
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

const resolveDispute = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resolution, adminNotes = '' } = req.body;

    if (!['refund', 'proceed'].includes(resolution)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_RESOLUTION', message: 'Resolution must be either "refund" or "proceed"' },
      });
    }

    const dispute = await Dispute.findById(id).populate('booking');
    if (!dispute) {
      return res.status(404).json({
        success: false,
        error: { code: 'DISPUTE_NOT_FOUND', message: 'Dispute not found' },
      });
    }

    if (dispute.status === 'resolved') {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_RESOLVED', message: 'Dispute is already resolved' },
      });
    }

    dispute.status = 'resolved';
    dispute.resolution = resolution;
    dispute.adminNotes = adminNotes;
    dispute.resolvedBy = req.user._id;
    dispute.resolvedAt = new Date();
    await dispute.save();

    const booking = dispute.booking;

    if (resolution === 'refund') {
      // Process gateway refund
      try {
        await paymentService.refundPayment({
          bookingId: booking._id,
          adminId: req.user._id,
          reason: `Dispute resolved in customer favor: ${adminNotes}`,
        });
      } catch (err) {
        console.error('Refund failed during dispute resolution:', err);
      }
    } else {
      // 'proceed' releases hold, mark completion verified if not already
      if (booking.completion) {
        booking.completion.status = 'verified';
        await booking.save();
      }
    }

    // Socket notification
    try {
      const io = getIO();
      if (io) {
        io.to(`ticket:${booking._id}`).emit('booking:dispute_resolved', {
          bookingId: booking._id,
          disputeId: dispute._id,
          resolution,
          adminNotes,
        });
      }

      await notificationService.createNotification({
        userId: booking.customer,
        title: 'Dispute Resolved',
        message: `Admin has resolved the dispute on booking #${booking._id.toString().slice(-6)}: ${resolution.toUpperCase()}.`,
        type: 'dispute_resolved',
        link: `/bookings/${booking._id}`,
      });
    } catch (e) {
      // Non-blocking
    }

    return res.json({
      success: true,
      data: { dispute },
      message: `Dispute resolved with resolution: ${resolution}`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listDisputes,
  resolveDispute,
};
