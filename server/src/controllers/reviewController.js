const reviewService = require('../services/review/reviewService');

const createReview = async (req, res, next) => {
  try {
    const { id } = req.params; // booking id
    const { rating, comment, tags } = req.body;

    const review = await reviewService.createReview({
      bookingId: id,
      customerId: req.user._id,
      rating,
      comment,
      tags,
    });

    return res.status(201).json({
      success: true,
      data: { review },
      message: 'Review submitted successfully',
    });
  } catch (error) {
    next(error);
  }
};

const getTechnicianReviews = async (req, res, next) => {
  try {
    const { id } = req.params; // technician profile id
    const { page = 1, limit = 20 } = req.query;

    const result = await reviewService.getTechnicianReviews(id, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const moderateReview = async (req, res, next) => {
  try {
    const { id } = req.params; // review id
    const { isHidden } = req.body;

    const review = await reviewService.moderateReview({
      reviewId: id,
      adminId: req.user._id,
      isHidden,
    });

    return res.json({
      success: true,
      data: { review },
      message: `Review ${isHidden ? 'hidden' : 'unhidden'} successfully`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReview,
  getTechnicianReviews,
  moderateReview,
};
