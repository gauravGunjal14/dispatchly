const completionService = require('../services/booking/completionService');
const storageService = require('../services/storage/storageService');
const TechnicianProfile = require('../models/TechnicianProfile');
const Booking = require('../models/Booking');

const submitCompletion = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { notes, partsUsed, finalPrice } = req.body;

    const profile = await TechnicianProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROFILE_NOT_FOUND', message: 'Technician profile not found' },
      });
    }

    const booking = await completionService.submitCompletion({
      bookingId,
      technicianProfileId: profile._id,
      notes,
      partsUsed,
      finalPrice,
      evidenceFiles: req.files || [],
    });

    return res.status(200).json({
      success: true,
      data: { completion: booking.completion },
      message: 'Completion proof submitted successfully',
    });
  } catch (error) {
    next(error);
  }
};

const verifyCompletion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, disputeReason } = req.body;

    const result = await completionService.verifyCompletion({
      bookingId: id,
      actorId: req.user._id,
      role: req.user.role,
      action: action || 'verify',
      disputeReason,
    });

    return res.json({
      success: true,
      data: result,
      message: action === 'dispute' ? 'Dispute raised successfully' : 'Completion verified and job marked completed',
    });
  } catch (error) {
    next(error);
  }
};

const getEvidencePhoto = async (req, res, next) => {
  try {
    const { id, filename } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found' },
      });
    }

    // Role check: customer, assigned tech, or admin
    const isAdmin = req.user.role === 'admin';
    const isCustomer = booking.customer.toString() === req.user._id.toString();
    let isAssignedTech = false;
    if (booking.assignedTechnician) {
      const tech = await TechnicianProfile.findById(booking.assignedTechnician);
      if (tech && tech.user.toString() === req.user._id.toString()) {
        isAssignedTech = true;
      }
    }

    if (!isAdmin && !isCustomer && !isAssignedTech) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not authorized to view evidence photos for this booking' },
      });
    }

    const key = `evidence/${filename}`;
    const stream = storageService.getFileStream(key);
    stream.pipe(res);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: { code: 'PHOTO_NOT_FOUND', message: 'Evidence photo not found' },
      });
    }
    next(error);
  }
};

module.exports = {
  submitCompletion,
  verifyCompletion,
  getEvidencePhoto,
};
