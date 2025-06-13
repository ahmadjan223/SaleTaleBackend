const express = require('express');
const router = express.Router();
const retailerController = require('../controllers/retailer.controller');
const auth = require('../middleware/auth'); // You'll need to create this middleware
// const adminAuth = require('../middleware/adminAuth'); // Optional: if you have specific admin auth

// Salesman specific routes (require auth)
router.post('/', auth, retailerController.createRetailer);
router.get('/', auth, retailerController.getRetailers); 
router.get('/nearby', auth, retailerController.getRetailersByLocation);
router.get('/:id', auth, retailerController.getRetailerById);
router.put('/:id', auth, retailerController.updateRetailer);
router.delete('/:id', auth, retailerController.deleteRetailer); // Salesman delete

// Admin specific routes
// Assuming getAllRetailers in controller is suitable for admin (fetches all)
router.get('/admin/all', retailerController.getAllRetailers); // Auth can be added if all admin routes need it: auth, retailerController.getAllRetailers

// Admin create retailer with assigned salesman
router.post('/admin/create', retailerController.adminCreateRetailer);

// Admin update retailer with assigned salesman
router.put('/admin/:id', retailerController.adminUpdateRetailer);

// Admin delete retailer - uses DELETE method
router.delete('/admin/:id', retailerController.adminDeleteRetailer); // Similarly, add auth if needed: auth, retailerController.adminDeleteRetailer
// Ensure this route exists for fetching specific retailer details by ID for admin purposes
router.get('/admin/details/:id', retailerController.adminGetRetailerById); // Assuming adminGetRetailerById is the correct controller function name

// Remove or comment out the older /admin/:id if it's redundant or conflicts
// router.get('/admin/:id', retailerController.adminGetRetailer); 

module.exports = router; 