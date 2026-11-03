const paymentService = require('../services/payment/paymentService');
const Payment = require('../models/Payment');
const Payout = require('../models/Payout');
const PlatformFee = require('../models/PlatformFee');
const TechnicianProfile = require('../models/TechnicianProfile');
const Booking = require('../models/Booking');

const payBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, currency, paymentMethod, idempotencyKey, simulateFailure } = req.body;

    const result = await paymentService.processPayment({
      bookingId: id,
      customerId: req.user._id,
      amount,
      currency,
      paymentMethod,
      idempotencyKey,
      simulateFailure,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { code: result.code || 'PAYMENT_FAILED', message: result.error },
        data: { payment: result.payment },
      });
    }

    return res.json({
      success: true,
      data: result,
      message: result.alreadyCaptured
        ? 'Payment already captured for this booking'
        : 'Payment processed successfully',
    });
  } catch (error) {
    next(error);
  }
};

const getBookingPayment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [payment, platformFee, payout] = await Promise.all([
      Payment.findOne({ booking: id }),
      PlatformFee.findOne({ booking: id }),
      Payout.findOne({ booking: id }),
    ]);

    return res.json({
      success: true,
      data: {
        payment,
        platformFee,
        payout,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getTechnicianEarnings = async (req, res, next) => {
  try {
    const profile = await TechnicianProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROFILE_NOT_FOUND', message: 'Technician profile not found' },
      });
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [payouts, totalPayouts] = await Promise.all([
      Payout.find({ technician: profile._id })
        .populate({
          path: 'booking',
          select: 'ticketNumber category description completedAt',
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Payout.countDocuments({ technician: profile._id }),
    ]);

    // Aggregate statistics
    const statsResult = await Payout.aggregate([
      { $match: { technician: profile._id, status: 'paid' } },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$amount' },
          totalFeesDeducted: { $sum: '$feeDeducted' },
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = statsResult[0] || {
      totalEarnings: profile.totalEarnings || 0,
      totalFeesDeducted: 0,
      count: 0,
    };

    return res.json({
      success: true,
      data: {
        summary: {
          totalEarnings: profile.totalEarnings || stats.totalEarnings,
          totalFeesDeducted: stats.totalFeesDeducted,
          paidJobsCount: stats.count,
        },
        payouts,
        pagination: {
          total: totalPayouts,
          page: parseInt(page, 10),
          pages: Math.ceil(totalPayouts / parseInt(limit, 10)),
          limit: parseInt(limit, 10),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const adminRefund = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await paymentService.refundPayment({
      bookingId: id,
      adminId: req.user._id,
      reason,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'REFUND_FAILED', message: result.error },
      });
    }

    return res.json({
      success: true,
      data: result,
      message: 'Payment refunded successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  payBooking,
  getBookingPayment,
  getTechnicianEarnings,
  adminRefund,
};
