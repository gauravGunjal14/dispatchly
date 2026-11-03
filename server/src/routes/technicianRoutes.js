const express = require('express');
const router = express.Router();
const technicianController = require('../controllers/technicianController');
const dispatchController = require('../controllers/dispatchController');
const quoteController = require('../controllers/quoteController');
const completionController = require('../controllers/completionController');
const paymentController = require('../controllers/paymentController');
const reviewController = require('../controllers/reviewController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { validate } = require('../validation/authValidation');
const {
  updateProfileSchema,
  toggleAvailabilitySchema,
  updateLocationSchema,
  inventoryItemSchema,
  updateJobStatusSchema,
} = require('../validation/technicianValidation');

// Profile & Verification Status
router.get('/me/profile', authenticateToken, authorizeRoles('technician'), technicianController.getMyProfile);
router.put(
  '/me/profile',
  authenticateToken,
  authorizeRoles('technician'),
  validate(updateProfileSchema),
  technicianController.updateMyProfile
);

// Availability & GPS
router.put(
  '/me/availability',
  authenticateToken,
  authorizeRoles('technician'),
  validate(toggleAvailabilitySchema),
  technicianController.toggleAvailability
);
router.patch(
  '/me/availability',
  authenticateToken,
  authorizeRoles('technician'),
  validate(toggleAvailabilitySchema),
  technicianController.toggleAvailability
);
router.put(
  '/me/location',
  authenticateToken,
  authorizeRoles('technician'),
  validate(updateLocationSchema),
  technicianController.updateLocation
);
router.patch(
  '/location',
  authenticateToken,
  authorizeRoles('technician'),
  dispatchController.patchLocation
);

// Active Jobs & Technician Dispatch Actions
router.get(
  '/jobs/current',
  authenticateToken,
  authorizeRoles('technician'),
  dispatchController.getCurrentJob
);
router.post(
  '/jobs/:bookingId/status',
  authenticateToken,
  authorizeRoles('technician'),
  validate(updateJobStatusSchema),
  dispatchController.updateJobStatus
);
router.post(
  '/jobs/:bookingId/quote',
  authenticateToken,
  authorizeRoles('technician'),
  quoteController.submitQuote
);
router.post(
  '/jobs/:bookingId/complete',
  authenticateToken,
  authorizeRoles('technician'),
  upload.array('evidence', 5),
  completionController.submitCompletion
);
router.post(
  '/jobs/:bookingId/cancel',
  authenticateToken,
  authorizeRoles('technician'),
  dispatchController.cancelJob
);

// Documents (Protected download accessible by owner technician or admin)
router.post(
  '/me/documents',
  authenticateToken,
  authorizeRoles('technician'),
  upload.single('file'),
  technicianController.uploadDocument
);
router.get('/me/documents', authenticateToken, authorizeRoles('technician'), technicianController.getMyDocuments);
router.get(
  '/documents/:id/download',
  authenticateToken,
  authorizeRoles('technician', 'admin'),
  technicianController.downloadDocument
);

// Inventory Management
router.get('/me/inventory', authenticateToken, authorizeRoles('technician'), technicianController.getInventory);
router.post(
  '/me/inventory',
  authenticateToken,
  authorizeRoles('technician'),
  validate(inventoryItemSchema),
  technicianController.addInventoryItem
);
router.put(
  '/me/inventory/:id',
  authenticateToken,
  authorizeRoles('technician'),
  technicianController.updateInventoryItem
);
router.delete(
  '/me/inventory/:id',
  authenticateToken,
  authorizeRoles('technician'),
  technicianController.deleteInventoryItem
);

// Earnings & Payouts
router.get('/me/earnings', authenticateToken, authorizeRoles('technician'), paymentController.getTechnicianEarnings);

// Public / Authenticated Reviews for a technician
router.get('/:id/reviews', reviewController.getTechnicianReviews);

module.exports = router;
