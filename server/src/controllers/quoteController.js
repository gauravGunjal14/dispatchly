const quoteService = require('../services/booking/quoteService');
const TechnicianProfile = require('../models/TechnicianProfile');

const submitQuote = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { lineItems, notes } = req.body;

    const profile = await TechnicianProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROFILE_NOT_FOUND', message: 'Technician profile not found' },
      });
    }

    const quote = await quoteService.createQuote({
      bookingId,
      technicianProfileId: profile._id,
      lineItems,
      notes,
    });

    return res.status(201).json({
      success: true,
      data: { quote },
      message: 'Quotation submitted successfully',
    });
  } catch (error) {
    next(error);
  }
};

const decideQuote = async (req, res, next) => {
  try {
    const { id } = req.params; // booking id or quote id
    const { quoteId, action, rejectionReason } = req.body;

    const resolvedQuoteId = quoteId || id;
    const quote = await quoteService.decideQuote({
      quoteId: resolvedQuoteId,
      customerId: req.user._id,
      action,
      rejectionReason,
    });

    return res.json({
      success: true,
      data: { quote },
      message: `Quotation ${action} successfully`,
    });
  } catch (error) {
    next(error);
  }
};

const getBookingQuote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quote = await quoteService.getQuoteByBooking(id);

    return res.json({
      success: true,
      data: { quote },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitQuote,
  decideQuote,
  getBookingQuote,
};
