const express = require('express');
const router = express.Router();
const retailerController = require('../controllers/retailer.controller');
const auth = require('../middleware/auth'); // You'll need to create this middleware
const adminAuth = require('../middleware/adminAuth');

// Salesman specific routes (require auth)
router.post('/', auth, retailerController.createRetailer);
router.get('/', auth, retailerController.getRetailers); 
router.get('/nearby', auth, retailerController.getRetailersByLocation);
router.get('/:id', auth, retailerController.getRetailerById);
router.put('/:id', auth, retailerController.updateRetailer);
router.delete('/:id', auth, retailerController.deleteRetailer); // Salesman delete

// Admin specific routes (require adminAuth)
router.get('/admin/all', adminAuth, retailerController.getAllRetailers);
router.post('/admin/create', adminAuth, retailerController.adminCreateRetailer);
router.put('/admin/:id', adminAuth, retailerController.adminUpdateRetailer);
router.delete('/admin/:id', adminAuth, retailerController.adminDeleteRetailer);
router.put('/admin/:id/status', adminAuth, retailerController.toggleRetailerStatus);
router.get('/admin/details/:id', adminAuth, retailerController.adminGetRetailerById);

// Ensure this route exists for fetching specific retailer details by ID for admin purposes
// router.get('/admin/:id', retailerController.adminGetRetailer); 

module.exports = router; 