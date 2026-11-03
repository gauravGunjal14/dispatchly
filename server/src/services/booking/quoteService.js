const Quote = require('../../models/Quote');
const Booking = require('../../models/Booking');
const notificationService = require('../notificationService');
const { getIO } = require('../socketService');

class QuoteService {
  /**
   * Technician submits a formal quote for the customer to review.
   */
  async createQuote({ bookingId, technicianProfileId, lineItems, notes = '' }) {
    if (!bookingId) throw new Error('bookingId is required');
    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      throw new Error('At least one line item is required in the quotation');
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error('Booking not found');

    if (booking.assignedTechnician.toString() !== technicianProfileId.toString()) {
      throw new Error('Not authorized: You are not the assigned technician for this booking');
    }

    // Calculate total
    const computedTotal = lineItems.reduce((acc, item) => {
      const qty = Number(item.qty) || 1;
      const unitPrice = Number(item.unitPrice) || 0;
      return acc + qty * unitPrice;
    }, 0);

    const quote = await Quote.create({
      booking: bookingId,
      technician: technicianProfileId,
      lineItems: lineItems.map((item) => ({
        description: item.description,
        qty: Number(item.qty) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        total: (Number(item.qty) || 1) * (Number(item.unitPrice) || 0),
      })),
      total: computedTotal,
      notes,
      status: 'pending',
    });

    // Link quote to booking
    booking.quote = quote._id;
    await booking.save();

    // Socket broadcast and notification to customer
    try {
      const io = getIO();
      if (io) {
        io.to(`ticket:${bookingId}`).emit('booking:quote', {
          quoteId: quote._id,
          total: computedTotal,
          lineItems: quote.lineItems,
          notes,
          status: 'pending',
        });
      }

      await notificationService.createNotification({
        userId: booking.customer,
        title: 'New Service Quote Received',
        message: `Technician has submitted a quotation of $${computedTotal.toFixed(2)} for your review.`,
        type: 'quote',
        link: `/bookings/${bookingId}`,
      });
    } catch (e) {
      // Non-blocking notification
    }

    return quote;
  }

  /**
   * Customer approves or rejects the quote.
   */
  async decideQuote({ quoteId, customerId, action, rejectionReason = '' }) {
    if (!['approved', 'rejected'].includes(action)) {
      throw new Error('Action must be either "approved" or "rejected"');
    }

    const quote = await Quote.findById(quoteId).populate('booking');
    if (!quote) throw new Error('Quote not found');

    const booking = quote.booking;
    if (!booking) throw new Error('Associated booking not found');

    if (booking.customer.toString() !== customerId.toString()) {
      throw new Error('Not authorized: Only the booking customer can decide on this quote');
    }

    if (quote.status !== 'pending') {
      throw new Error(`Quote cannot be decided: already in status "${quote.status}"`);
    }

    quote.status = action;
    quote.decidedAt = new Date();
    if (action === 'rejected') {
      quote.rejectionReason = rejectionReason;
    }

    await quote.save();

    if (action === 'approved') {
      // Update booking pricing with approved quote total
      booking.pricing.baseAmount = quote.total;
      await booking.save();
    }

    // Realtime notification
    try {
      const io = getIO();
      if (io) {
        io.to(`ticket:${booking._id}`).emit('booking:quote_decision', {
          quoteId: quote._id,
          status: action,
          rejectionReason,
        });
      }

      const TechnicianProfile = require('../../models/TechnicianProfile');
      const techProfile = await TechnicianProfile.findById(quote.technician);
      if (techProfile && techProfile.user) {
        await notificationService.createNotification({
          userId: techProfile.user,
          title: `Quote ${action === 'approved' ? 'Approved' : 'Declined'}`,
          message:
            action === 'approved'
              ? `Customer approved your quotation for booking #${booking._id.toString().slice(-6)}. You may proceed with the job.`
              : `Customer declined your quotation. Reason: ${rejectionReason || 'No reason provided'}`,
          type: 'quote_decision',
          link: `/technician/dashboard`,
        });
      }
    } catch (e) {
      // Non-blocking
    }

    return quote;
  }

  async getQuoteByBooking(bookingId) {
    return Quote.findOne({ booking: bookingId }).sort({ createdAt: -1 });
  }
}

const quoteService = new QuoteService();
module.exports = quoteService;
