const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const serviceController = require('../controllers/serviceController');
const settingsController = require('../controllers/settingsController');
const bookingController = require('../controllers/bookingController');
const dispatchController = require('../controllers/dispatchController');
const disputeController = require('../controllers/disputeController');
const paymentController = require('../controllers/paymentController');
const reviewController = require('../controllers/reviewController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validate } = require('../validation/authValidation');
const { verifyTechnicianSchema } = require('../validation/technicianValidation');
const { serviceCatalogSchema, updateServiceSchema } = require('../validation/serviceValidation');
const { updateSettingsSchema } = require('../validation/settingsValidation');

// Admin-only middleware applied to all routes in this router
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

// 1. Technicians Management & Verification
router.get('/technicians', adminController.listTechnicians);
router.get('/technicians/:id', adminController.getTechnicianDetails);
router.put('/technicians/:id/verify', validate(verifyTechnicianSchema), adminController.verifyTechnician);

// 2. Service Catalogue Management
router.get('/services', serviceController.adminListServices);
router.post('/services', validate(serviceCatalogSchema), serviceController.createService);
router.put('/services/:id', validate(updateServiceSchema), serviceController.updateService);
router.delete('/services/:id', serviceController.toggleServiceActive);

// 3. Platform Settings (Configurable dispatch weights, fees, SLA)
router.get('/settings', settingsController.getSettings);
router.put('/settings', validate(updateSettingsSchema), settingsController.updateSettings);

// 4. Global Bookings Monitor
router.get('/bookings', bookingController.adminListBookings);
router.get('/bookings/:id', bookingController.adminGetBookingDetail);

// 5. Intelligent Dispatch Monitor & Manual Override
router.get('/dispatch/monitor', dispatchController.getDispatchMonitor);
router.get('/dispatch/:bookingId', dispatchController.getBookingDispatchDetail);
router.post('/dispatch/:bookingId/assign', dispatchController.manualAssignBooking);
router.post('/dispatch/:bookingId/retry', dispatchController.retryDispatchBooking);

// 6. Reassignment Requests Queue
router.get('/reassignments', dispatchController.listReassignments);
router.put('/reassignments/:id/decide', dispatchController.decideReassignmentRequest);

// 7. Disputes Management
router.get('/disputes', disputeController.listDisputes);
router.put('/disputes/:id/resolve', disputeController.resolveDispute);

// 8. Payment & Refund Management
router.post('/bookings/:id/refund', paymentController.adminRefund);
router.get('/payments/ledger', adminController.listPaymentsLedger);

// 9. Review Moderation
router.put('/reviews/:id/moderate', reviewController.moderateReview);

// 10. Executive KPIs, Timeseries, and Operations Panel
router.get('/kpis', adminController.getKpis);
router.get('/kpis/timeseries', adminController.getTimeseries);
router.get('/reports/:type', adminController.getReport);
router.get('/operations/panel', adminController.getOperationsPanel);

// 11. User Management (Customers & Technicians)
router.get('/users', adminController.listUsers);
router.put('/users/:id/toggle-status', adminController.toggleUserStatus);

// 12. Audit Log Viewer
router.get('/audit-logs', adminController.listAuditLogs);

module.exports = router;
