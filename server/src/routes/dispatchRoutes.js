const express = require('express');
const router = express.Router();
const dispatchController = require('../controllers/dispatchController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// All dispatch routes require authentication
router.use(authenticateToken);

// Technician offer management
router.get('/offers', authorizeRoles('technician'), dispatchController.getMyOffers);
router.post('/offers/:id/accept', authorizeRoles('technician'), dispatchController.acceptMyOffer);
router.post('/offers/:id/reject', authorizeRoles('technician'), dispatchController.rejectMyOffer);

module.exports = router;
