const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');

// Public Service Catalogue Endpoints
router.get('/', serviceController.listServices);
router.get('/:id', serviceController.getServiceDetail);

module.exports = router;
