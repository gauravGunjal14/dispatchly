const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const quoteController = require('../controllers/quoteController');
const completionController = require('../controllers/completionController');
const paymentController = require('../controllers/paymentController');
const reviewController = require('../controllers/reviewController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validate } = require('../validation/authValidation');
const {
  estimateBookingSchema,
  createBookingSchema,
  cancelBookingSchema,
} = require('../validation/bookingValidation');

// Pricing estimate can be queried by authenticated users
router.post('/estimate', authenticateToken, validate(estimateBookingSchema), bookingController.getEstimate);

// Customer-exclusive booking operations (Technicians are blocked from creating bookings)
router.post(
  '/',
  authenticateToken,
  authorizeRoles('customer'),
  validate(createBookingSchema),
  bookingController.createBooking
);
router.get('/', authenticateToken, authorizeRoles('customer'), bookingController.getMyBookings);
router.get('/:id', authenticateToken, authorizeRoles('customer', 'admin'), bookingController.getMyBookingDetail);
router.post(
  '/:id/cancel',
  authenticateToken,
  authorizeRoles('customer'),
  validate(cancelBookingSchema),
  bookingController.cancelMyBooking
);

// Quotation inspection & customer decision
router.get('/:id/quote', authenticateToken, quoteController.getBookingQuote);
router.put('/:id/quote', authenticateToken, authorizeRoles('customer'), quoteController.decideQuote);

// Completion verification & dispute
router.post(
  '/:id/verify-completion',
  authenticateToken,
  authorizeRoles('customer', 'admin'),
  completionController.verifyCompletion
);
router.post(
  '/:id/dispute',
  authenticateToken,
  authorizeRoles('customer', 'admin'),
  (req, res, next) => {
    req.body.action = 'dispute';
    return completionController.verifyCompletion(req, res, next);
  }
);
router.get('/:id/evidence/:filename', authenticateToken, completionController.getEvidencePhoto);

// Payment
router.post('/:id/pay', authenticateToken, authorizeRoles('customer'), paymentController.payBooking);
router.get('/:id/payment', authenticateToken, paymentController.getBookingPayment);

// Review
router.post('/:id/review', authenticateToken, authorizeRoles('customer'), reviewController.createReview);

module.exports = router;
