const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const technicianRoutes = require('./technicianRoutes');
const adminRoutes = require('./adminRoutes');
const serviceRoutes = require('./serviceRoutes');
const bookingRoutes = require('./bookingRoutes');
const dispatchRoutes = require('./dispatchRoutes');
const notificationRoutes = require('./notificationRoutes');

// Health Check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'dispatchly-server',
  });
});

// Auth Routes
router.use('/auth', authRoutes);

// Public & Customer Routes
router.use('/services', serviceRoutes);
router.use('/bookings', bookingRoutes);

// Role-protected Routes
router.use('/technicians', technicianRoutes);
router.use('/admin', adminRoutes);
router.use('/dispatch', dispatchRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
