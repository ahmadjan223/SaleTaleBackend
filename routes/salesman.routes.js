const express = require('express');
const router = express.Router();
const salesmanController = require('../controllers/salesman.controller');
const auth = require('../middleware/auth'); // You'll need to create this middleware
// const adminAuth = require('../middleware/adminAuth'); // Optional

// Public routes
router.post('/register', salesmanController.register);
router.post('/login', salesmanController.login);

// Protected routes (require general auth)
router.get('/active', auth, salesmanController.getActiveSalesmen);
router.get('/inactive', auth, salesmanController.getInactiveSalesmen);
router.post('/logout', auth, salesmanController.logoutSalesman);
router.delete('/:id', auth, salesmanController.deleteSalesman);

// Admin specific routes
router.get('/admin/all', salesmanController.getAllSalesmen);
// Admin delete salesman uses _id in param, not googleId like the other delete route
router.delete('/admin/:id', salesmanController.adminDeleteSalesman);
router.get('/admin/details/:id', salesmanController.adminGetSalesmanById);
// Admin create and update salesman
router.post('/admin/create', salesmanController.adminCreateSalesman);
router.put('/admin/:id', salesmanController.adminUpdateSalesman);
// Admin toggle salesman status
router.put('/admin/:id/status', salesmanController.toggleSalesmanStatus);

// Update salesman details (protected route)
router.put('/:id', auth, salesmanController.update);

module.exports = router; 