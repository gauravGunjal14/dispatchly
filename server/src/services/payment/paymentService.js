const mongoose = require('mongoose');
const Payment = require('../../models/Payment');
const PlatformFee = require('../../models/PlatformFee');
const Payout = require('../../models/Payout');
const Booking = require('../../models/Booking');
const Dispute = require('../../models/Dispute');
const TechnicianProfile = require('../../models/TechnicianProfile');
const PlatformSettings = require('../../models/PlatformSettings');
const { mockPaymentGateway } = require('./mockPaymentGateway');
const notificationService = require('../notificationService');
const { getIO } = require('../socketService');

class PaymentService {
  /**
   * Process payment for a booking
   * Idempotent by booking and idempotencyKey.
   */
  async processPayment({
    bookingId,
    customerId,
    amount,
    currency = 'USD',
    paymentMethod = {},
    idempotencyKey,
    simulateFailure = false,
  }) {
    if (!bookingId) throw new Error('bookingId is required');

    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error('Booking not found');

    // Customer authorization check (if customerId provided)
    if (customerId && booking.customer.toString() !== customerId.toString()) {
      throw new Error('Not authorized to pay for this booking');
    }

    // Check for open disputes
    const openDispute = await Dispute.findOne({ booking: bookingId, status: 'open' });
    if (openDispute) {
      throw new Error('Payment cannot be processed while a dispute is open on this booking');
    }

    // Check for existing payment
    let payment = await Payment.findOne({ booking: bookingId });

    if (payment && payment.status === 'captured') {
      return {
        success: true,
        alreadyCaptured: true,
        payment,
        message: 'Payment has already been captured for this booking',
      };
    }

    // Determine final payment amount if not explicitly passed
    let finalAmount = amount;
    if (finalAmount == null || finalAmount === undefined) {
      if (booking.completion && booking.completion.finalPrice != null) {
        finalAmount = booking.completion.finalPrice;
      } else if (booking.pricing && booking.pricing.baseAmount) {
        finalAmount = booking.pricing.baseAmount;
      } else {
        finalAmount = 50.0; // fallback standard service baseline
      }
    }

    // Load platform settings for fee calculation
    let settings = { platformFeePerTicket: 1.5, feePayer: 'technician' };
    try {
      if (typeof PlatformSettings.getSettings === 'function') {
        settings = await PlatformSettings.getSettings();
      }
    } catch (e) {
      // Use fallback defaults
    }

    const feeAmount = settings.platformFeePerTicket != null ? settings.platformFeePerTicket : 1.5;
    const feePayer = settings.feePayer || 'technician';

    // Call payment gateway
    const gatewayResult = await mockPaymentGateway.capture({
      amount: finalAmount,
      currency,
      paymentMethod,
      idempotencyKey: idempotencyKey || `key_${bookingId}_${Date.now()}`,
      simulateFailure,
    });

    if (!gatewayResult.success) {
      // Record failed payment attempt
      if (!payment) {
        payment = new Payment({
          booking: bookingId,
          customer: booking.customer,
          technician: booking.assignedTechnician,
          amount: finalAmount,
          currency,
          status: 'failed',
          idempotencyKey: idempotencyKey || `key_${bookingId}`,
          attempts: 1,
          ledger: [{ status: 'failed', amount: finalAmount, note: gatewayResult.error || 'Payment declined' }],
        });
      } else {
        payment.status = 'failed';
        payment.attempts += 1;
        payment.ledger.push({
          status: 'failed',
          amount: finalAmount,
          note: gatewayResult.error || 'Payment declined',
        });
      }
      await payment.save();

      return {
        success: false,
        error: gatewayResult.error,
        code: gatewayResult.code,
        payment,
      };
    }

    // Success path: upsert Payment record
    if (!payment) {
      payment = new Payment({
        booking: bookingId,
        customer: booking.customer,
        technician: booking.assignedTechnician,
        amount: finalAmount,
        currency,
        status: 'captured',
        gatewayRef: gatewayResult.transactionId,
        idempotencyKey: idempotencyKey || `key_${bookingId}`,
        attempts: 1,
        ledger: [{ status: 'captured', amount: finalAmount, note: 'Payment captured successfully' }],
      });
    } else {
      payment.status = 'captured';
      payment.gatewayRef = gatewayResult.transactionId;
      payment.amount = finalAmount;
      payment.ledger.push({
        status: 'captured',
        amount: finalAmount,
        note: 'Payment captured successfully',
      });
    }
    await payment.save();

    // Create PlatformFee record idempotently (unique index prevents duplicates)
    let platformFee = null;
    try {
      platformFee = await PlatformFee.create({
        booking: bookingId,
        amount: feeAmount,
        currency,
        feePayer,
        capturedAt: new Date(),
      });
    } catch (err) {
      if (err.code === 11000) {
        platformFee = await PlatformFee.findOne({ booking: bookingId });
      } else {
        console.error('Error creating PlatformFee:', err);
      }
    }

    // Calculate technician payout
    let payoutAmount = finalAmount;
    let feeDeducted = 0;
    if (feePayer === 'technician') {
      payoutAmount = Math.max(0, finalAmount - feeAmount);
      feeDeducted = feeAmount;
    } else if (feePayer === 'split') {
      const halfFee = feeAmount / 2;
      payoutAmount = Math.max(0, finalAmount - halfFee);
      feeDeducted = halfFee;
    } else {
      // 'customer' pays fee directly on top
      payoutAmount = finalAmount;
      feeDeducted = 0;
    }

    // Create Payout record idempotently
    let payout = null;
    if (booking.assignedTechnician) {
      try {
        payout = await Payout.create({
          technician: booking.assignedTechnician,
          booking: bookingId,
          amount: payoutAmount,
          feeDeducted,
          currency,
          status: 'paid',
          paidAt: new Date(),
        });

        // Atomically increment technician profile total earnings
        await TechnicianProfile.findByIdAndUpdate(booking.assignedTechnician, {
          $inc: { totalEarnings: payoutAmount },
        });
      } catch (err) {
        if (err.code === 11000) {
          payout = await Payout.findOne({ booking: bookingId });
        } else {
          console.error('Error creating Payout:', err);
        }
      }
    }

    // Realtime notification to customer and technician
    try {
      const io = getIO();
      if (io) {
        io.to(`ticket:${bookingId}`).emit('payment:success', {
          bookingId,
          amount: finalAmount,
          currency,
          status: 'captured',
        });
      }

      await notificationService.createNotification({
        userId: booking.customer,
        title: 'Payment Successful',
        message: `Your payment of ${currency} ${finalAmount.toFixed(2)} for booking #${bookingId.toString().slice(-6)} was successful.`,
        type: 'payment',
        link: `/bookings/${bookingId}`,
      });

      if (booking.assignedTechnician) {
        const techProfile = await TechnicianProfile.findById(booking.assignedTechnician);
        if (techProfile && techProfile.user) {
          await notificationService.createNotification({
            userId: techProfile.user,
            title: 'Payout Processed',
            message: `Payout of ${currency} ${payoutAmount.toFixed(2)} has been credited for booking #${bookingId.toString().slice(-6)}.`,
            type: 'payout',
            link: `/technician/earnings`,
          });
        }
      }
    } catch (e) {
      // Non-blocking notification error
    }

    return {
      success: true,
      payment,
      platformFee,
      payout,
    };
  }

  /**
   * Refund a captured payment (e.g. from admin dispute resolution)
   */
  async refundPayment({ bookingId, adminId, reason = 'admin_dispute_resolution' }) {
    const payment = await Payment.findOne({ booking: bookingId });
    if (!payment) throw new Error('No payment record found for this booking');
    if (payment.status !== 'captured') {
      throw new Error(`Cannot refund payment in status: ${payment.status}`);
    }

    const refundResult = await mockPaymentGateway.refund({
      transactionId: payment.gatewayRef,
      amount: payment.amount,
      reason,
    });

    if (refundResult.success) {
      payment.status = 'refunded';
      payment.ledger.push({
        status: 'refunded',
        amount: payment.amount,
        note: `Refunded by admin (${reason})`,
        at: new Date(),
      });
      await payment.save();

      // Reverse technician earnings if payout was created
      const payout = await Payout.findOne({ booking: bookingId });
      if (payout && payout.status === 'paid') {
        payout.status = 'pending'; // or cancelled
        await payout.save();
        await TechnicianProfile.findByIdAndUpdate(payout.technician, {
          $inc: { totalEarnings: -payout.amount },
        });
      }

      return { success: true, payment, refundId: refundResult.refundId };
    }

    return { success: false, error: 'Gateway failed to process refund' };
  }

  async getPaymentForBooking(bookingId) {
    return Payment.findOne({ booking: bookingId });
  }
}

const paymentService = new PaymentService();
module.exports = paymentService;
