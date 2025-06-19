const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statistics.controller');
const adminAuth = require('../middleware/adminAuth');

// Sales statistics route
router.get('/admin/statistics', adminAuth, statisticsController.getSalesStatistics);

module.exports = router; 