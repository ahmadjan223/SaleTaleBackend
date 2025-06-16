const express = require('express');
const router = express.Router();
const franchiseController = require('../controllers/franchise.controller');
const adminAuth = require('../middleware/adminAuth');

// Admin franchise management routes
router.post('/admin/create', adminAuth, franchiseController.createFranchise);
router.get('/admin/all', adminAuth, franchiseController.getAllFranchises);
router.get('/admin/:id', adminAuth, franchiseController.getFranchiseById);
router.put('/admin/:id', adminAuth, franchiseController.updateFranchise);
router.delete('/admin/:id', adminAuth, franchiseController.deleteFranchise);

// Get all salesmen of a franchise (admin only)
router.get('/admin/:id/salesmen', adminAuth, franchiseController.getFranchiseSalesmen);

module.exports = router; 