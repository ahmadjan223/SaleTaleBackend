const express = require('express');
const router = express.Router();
const saleController = require('../controllers/sale.controller');
const auth = require('../middleware/auth');
// const adminAuth = require('../middleware/adminAuth'); // Optional: if you have specific admin auth

// Salesman specific routes (require auth)
router.post('/', auth, saleController.createSale);
router.get('/', auth, saleController.getSales);
router.get('/retailer/:retailerId', auth, saleController.getRetailerSales);
router.delete('/:id', auth, saleController.deleteSale); // Salesman delete
router.put('/:id', auth, saleController.updateSale);

// Admin specific routes
router.get('/admin/all', saleController.getAllSales); // Add auth if needed
router.delete('/admin/:id', saleController.adminDeleteSale); // Add auth if needed

module.exports = router; 