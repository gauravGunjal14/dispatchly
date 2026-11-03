const mongoose = require('mongoose');
const Booking = require('../../models/Booking');
const InventoryItem = require('../../models/InventoryItem');
const TechnicianProfile = require('../../models/TechnicianProfile');
const Dispute = require('../../models/Dispute');
const storageService = require('../storage/storageService');
const notificationService = require('../notificationService');
const { finalizeSlaCompliance } = require('../sla/slaService');
const { getIO } = require('../socketService');

class CompletionService {
  /**
   * Technician submits proof of completion (notes, parts used, evidence photos).
   */
  async submitCompletion({
    bookingId,
    technicianProfileId,
    notes = '',
    partsUsed = [],
    finalPrice,
    evidenceFiles = [],
  }) {
    if (!bookingId) throw new Error('bookingId is required');

    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error('Booking not found');

    if (booking.assignedTechnician.toString() !== technicianProfileId.toString()) {
      throw new Error('Not authorized: You are not the assigned technician for this booking');
    }

    if (booking.status !== 'in_progress') {
      throw new Error(`Cannot submit completion for booking in status "${booking.status}". Must be in_progress.`);
    }

    // Save evidence photos via storageService
    const evidencePhotos = [];
    if (evidenceFiles && evidenceFiles.length > 0) {
      for (const file of evidenceFiles) {
        const saved = await storageService.saveFile({ file, subfolder: 'evidence' });
        evidencePhotos.push({
          path: saved.storageKey,
          originalName: saved.originalName,
          mimeType: saved.mimeType,
          size: saved.size,
        });
      }
    }

    // Parse parts used if passed as JSON string
    let parsedParts = partsUsed;
    if (typeof partsUsed === 'string') {
      try {
        parsedParts = JSON.parse(partsUsed);
      } catch (e) {
        parsedParts = [];
      }
    }

    // Normalize final price
    const resolvedFinalPrice =
      finalPrice != null ? Number(finalPrice) : booking.pricing?.baseAmount || 50.0;

    booking.completion = {
      status: 'submitted',
      submittedAt: new Date(),
      notes,
      partsUsed: parsedParts,
      finalPrice: resolvedFinalPrice,
      evidencePhotos,
      verifiedAt: null,
      verifiedBy: null,
      autoVerified: false,
    };

    await booking.save();

    // Socket notification to ticket room
    try {
      const io = getIO();
      if (io) {
        io.to(`ticket:${bookingId}`).emit('booking:completion_submitted', {
          bookingId,
          completion: booking.completion,
        });
      }

      await notificationService.createNotification({
        userId: booking.customer,
        title: 'Work Completed - Please Verify',
        message: `Technician has finished the work for booking #${bookingId.toString().slice(-6)}. Please review completion details and confirm.`,
        type: 'completion_submitted',
        link: `/bookings/${bookingId}`,
      });
    } catch (e) {
      // Non-blocking notification
    }

    return booking;
  }

  /**
   * Customer or Admin verifies completion or raises a dispute.
   */
  async verifyCompletion({ bookingId, actorId, role, action, disputeReason = '' }) {
    if (!['verify', 'dispute'].includes(action)) {
      throw new Error('Action must be either "verify" or "dispute"');
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error('Booking not found');

    if (role !== 'admin' && booking.customer.toString() !== actorId.toString()) {
      throw new Error('Not authorized: Only customer or admin can verify completion');
    }

    if (!booking.completion || booking.completion.status !== 'submitted') {
      throw new Error('No pending completion submission to verify');
    }

    if (action === 'dispute') {
      if (!disputeReason || !disputeReason.trim()) {
        throw new Error('Dispute reason is required');
      }

      booking.completion.status = 'disputed';
      await booking.save();

      const dispute = await Dispute.create({
        booking: bookingId,
        raisedBy: actorId,
        reason: disputeReason.trim(),
        status: 'open',
      });

      // Socket & admin notification
      try {
        const io = getIO();
        if (io) {
          io.to(`ticket:${bookingId}`).emit('booking:disputed', {
            bookingId,
            disputeId: dispute._id,
            reason: disputeReason,
          });
          io.to('admin:dispatch').emit('sla:warning', {
            bookingId,
            message: `Dispute raised on booking #${bookingId.toString().slice(-6)}`,
          });
        }

        await notificationService.notifyAdmins({
          title: 'Dispute Raised on Booking',
          body: `Customer raised dispute on booking #${bookingId.toString().slice(-6)}: ${disputeReason}`,
          type: 'dispute',
          data: { bookingId, disputeId: dispute._id },
        });

        if (booking.assignedTechnician) {
          const tech = await TechnicianProfile.findById(booking.assignedTechnician);
          if (tech && tech.user) {
            await notificationService.createNotification({
              userId: tech.user,
              title: 'Customer Raised Dispute',
              message: `A dispute has been raised on booking #${bookingId.toString().slice(-6)}. Admin review pending.`,
              type: 'dispute',
              link: `/technician/dashboard`,
            });
          }
        }
      } catch (e) {
        // Non-blocking
      }

      return { booking, dispute };
    }

    // Action === 'verify'
    booking.completion.status = 'verified';
    booking.completion.verifiedAt = new Date();
    booking.completion.verifiedBy = actorId;
    booking.status = 'completed';
    booking.completedAt = new Date();

    booking.statusHistory.push({
      status: 'completed',
      changedBy: actorId,
      note: 'Completion verified and work accepted',
      timestamp: new Date(),
    });

    // Idempotent Inventory Settlement
    if (!booking.inventorySettled && booking.assignedTechnician) {
      await this._settleInventory(booking);
      booking.inventorySettled = true;
    }

    // Finalize SLA outcome
    finalizeSlaCompliance(booking);

    // Decrement technician active job count
    if (booking.assignedTechnician) {
      await TechnicianProfile.findByIdAndUpdate(booking.assignedTechnician, {
        $inc: { activeJobCount: -1 },
      });
    }

    await booking.save();

    // Broadcast completion to ticket room and admin
    try {
      const io = getIO();
      if (io) {
        io.to(`ticket:${bookingId}`).emit('booking:completed', {
          bookingId,
          completedAt: booking.completedAt,
        });
        io.to(`ticket:${bookingId}`).emit('booking:status', {
          bookingId,
          status: 'completed',
        });
        io.to('admin:dispatch').emit('booking:status', {
          bookingId,
          status: 'completed',
        });
      }

      await notificationService.createNotification({
        userId: booking.customer,
        title: 'Booking Completed',
        message: `Booking #${bookingId.toString().slice(-6)} is verified. Please proceed to payment and review.`,
        type: 'booking_completed',
        link: `/bookings/${bookingId}`,
      });

      if (booking.assignedTechnician) {
        const tech = await TechnicianProfile.findById(booking.assignedTechnician);
        if (tech && tech.user) {
          await notificationService.createNotification({
            userId: tech.user,
            title: 'Completion Verified!',
            message: `Work for booking #${bookingId.toString().slice(-6)} has been verified and marked completed.`,
            type: 'booking_completed',
            link: `/technician/dashboard`,
          });
        }
      }
    } catch (e) {
      // Non-blocking
    }

    return { booking };
  }

  /**
   * Idempotent inventory consumption upon completion verification.
   * Decrements quantity and reservedQuantity, ensures quantity >= 0,
   * and triggers low stock alert if threshold crossed.
   */
  async _settleInventory(booking) {
    if (!booking.assignedTechnician) return;

    // Use parts from completion if provided, else reservations
    const partsToSettle =
      booking.completion.partsUsed && booking.completion.partsUsed.length > 0
        ? booking.completion.partsUsed
        : (booking.inventoryReservations || []).map((r) => ({
            partCode: r.partCode,
            quantity: r.quantity,
          }));

    for (const part of partsToSettle) {
      if (!part.partCode || !part.quantity) continue;

      const item = await InventoryItem.findOne({
        technician: booking.assignedTechnician,
        partCode: part.partCode.toUpperCase(),
      });

      if (item) {
        const usedQty = Number(part.quantity) || 0;
        const newQty = Math.max(0, item.quantity - usedQty);
        const newReserved = Math.max(0, (item.reservedQuantity || 0) - usedQty);

        item.quantity = newQty;
        item.reservedQuantity = newReserved;
        await item.save();

        // Check low stock threshold
        if (newQty <= item.lowStockThreshold) {
          const tech = await TechnicianProfile.findById(booking.assignedTechnician);
          if (tech && tech.user) {
            await notificationService.createNotification({
              userId: tech.user,
              title: 'Low Stock Alert',
              message: `Part "${item.name}" (${item.partCode}) is low on stock (${newQty} remaining).`,
              type: 'low_stock',
              link: `/technician/inventory`,
            });
          }
        }
      }
    }
  }

  async getCompletion(bookingId) {
    const booking = await Booking.findById(bookingId).select('completion status pricing');
    return booking?.completion || null;
  }
}

const completionService = new CompletionService();
module.exports = completionService;
