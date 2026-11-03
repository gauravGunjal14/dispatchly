const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', notificationController.getMyNotifications);
router.post('/read', notificationController.markNotificationsRead);

module.exports = router;
