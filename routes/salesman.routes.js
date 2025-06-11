const express = require('express');
const router = express.Router();
const salesmanController = require('../controllers/salesman.controller');
const auth = require('../middleware/auth'); // You'll need to create this middleware
// const adminAuth = require('../middleware/adminAuth'); // Optional

// Public routes
router.post('/register', salesmanController.register);
router.post('/login', salesmanController.login);

// Protected routes (require general auth)
router.get('/verified', auth, salesmanController.getVerifiedSalesmen);
router.get('/unverified', auth, salesmanController.getUnverifiedSalesmen);
router.put('/verify/:googleId', auth, salesmanController.verifySalesman); // This might be an admin action
router.post('/logout', auth, salesmanController.logoutSalesman);
router.delete('/:googleId', auth, salesmanController.deleteSalesman); // Salesman deleting their own or specific context

// Admin specific routes
router.get('/admin/all', salesmanController.getAllSalesmen); // Add adminAuth if needed
// Admin delete salesman uses _id in param, not googleId like the other delete route
router.delete('/admin/:id', salesmanController.adminDeleteSalesman); // Add adminAuth if needed
router.get('/admin/details/:id', salesmanController.adminGetSalesmanById); // Route for getting specific salesman details by admin

// Update salesman details (protected route)
router.put('/:id', auth, salesmanController.update);

module.exports = router; 