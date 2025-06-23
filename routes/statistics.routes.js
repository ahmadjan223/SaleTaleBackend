const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statistics.controller');
const adminAuth = require('../middleware/adminAuth');
const auth = require('../middleware/auth');

// // Sales statistics route
router.get('/admin/statistics', adminAuth, statisticsController.getSalesStatistics);
// Graph data statistics route
router.get('/admin/graph-data', adminAuth, statisticsController.graphDataStatistics);
// Salesman statistics route

module.exports = router; 


