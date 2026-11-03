const Review = require('../../models/Review');
const Booking = require('../../models/Booking');
const TechnicianProfile = require('../../models/TechnicianProfile');
const DispatchOffer = require('../../models/DispatchOffer');
const { calculateReliabilityScore } = require('./reliabilityService');
const notificationService = require('../notificationService');

class ReviewService {
  /**
   * Customer submits a rating and review for a completed booking.
   */
  async createReview({ bookingId, customerId, rating, comment = '', tags = [] }) {
    if (!bookingId) throw new Error('bookingId is required');
    if (!rating || rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5 stars');
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error('Booking not found');

    if (booking.customer.toString() !== customerId.toString()) {
      throw new Error('Not authorized: Only the customer who booked this service can submit a review');
    }

    if (booking.status !== 'completed') {
      throw new Error(`Cannot review booking in status "${booking.status}". Must be completed.`);
    }

    if (!booking.assignedTechnician) {
      throw new Error('No technician assigned to this booking to review');
    }

    // Check for existing review
    const existing = await Review.findOne({ booking: bookingId });
    if (existing) {
      throw new Error('A review has already been submitted for this booking');
    }

    const review = await Review.create({
      booking: bookingId,
      customer: customerId,
      technician: booking.assignedTechnician,
      rating: Number(rating),
      comment: comment.trim(),
      tags: Array.isArray(tags) ? tags : [],
    });

    // Update technician profile rating atomically
    const tech = await TechnicianProfile.findById(booking.assignedTechnician);
    if (tech) {
      const currentSum = tech.ratingSum || 0;
      const currentCount = tech.ratingCount || 0;
      const newSum = currentSum + Number(rating);
      const newCount = currentCount + 1;
      const newRating = Number((newSum / newCount).toFixed(2));

      tech.ratingSum = newSum;
      tech.ratingCount = newCount;
      tech.rating = newRating;

      // Recalculate technician reliability score
      try {
        const offersCount = await DispatchOffer.countDocuments({ technician: tech._id });
        const acceptedCount = await DispatchOffer.countDocuments({
          technician: tech._id,
          status: 'accepted',
        });
        const completedBookings = await Booking.find({
          assignedTechnician: tech._id,
          status: 'completed',
        });
        const slaMetCount = completedBookings.filter(
          (b) =>
            b.sla?.finalResult?.response !== 'missed' &&
            b.sla?.finalResult?.arrival !== 'missed' &&
            b.sla?.finalResult?.completion !== 'missed'
        ).length;

        const newReliability = calculateReliabilityScore({
          offersReceived: offersCount,
          offersAccepted: acceptedCount,
          slaEligible: completedBookings.length,
          slaMet: slaMetCount,
          assignedJobs: acceptedCount,
          cancelledByTech: 0,
        });

        tech.reliabilityScore = newReliability;
      } catch (err) {
        // Non-blocking reliability calculation error
      }

      await tech.save();

      // Notify technician of review
      if (tech.user) {
        try {
          await notificationService.createNotification({
            userId: tech.user,
            title: 'New Customer Review',
            message: `You received a ${rating}-star review for booking #${bookingId.toString().slice(-6)}.`,
            type: 'review',
            link: `/technician/dashboard`,
          });
        } catch (e) {
          // Non-blocking
        }
      }
    }

    return review;
  }

  async getTechnicianReviews(technicianProfileId, { page = 1, limit = 20 } = {}) {
    const filter = { technician: technicianProfileId, isHidden: false };
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('customer', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments(filter),
    ]);

    return { reviews, total, page, pages: Math.ceil(total / limit) };
  }

  async moderateReview({ reviewId, adminId, isHidden }) {
    const review = await Review.findById(reviewId);
    if (!review) throw new Error('Review not found');

    review.isHidden = Boolean(isHidden);
    await review.save();

    return review;
  }
}

const reviewService = new ReviewService();
module.exports = reviewService;
