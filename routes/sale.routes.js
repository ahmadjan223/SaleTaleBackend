const express = require('express');
const router = express.Router();
const saleController = require('../controllers/sale.controller');
const auth = require('../middleware/auth');

// Salesman specific routes (require auth)
router.post('/', auth, saleController.createSale);
router.get('/', auth, saleController.getSales);
router.get('/retailer/:retailerId', auth, saleController.getRetailerSales);
router.get('/:id', auth, saleController.getSale);
router.put('/:id', auth, saleController.updateSale);

// Admin routes (without auth for now)
router.get('/admin/all', saleController.getAllSales);
router.get('/admin/filtered', saleController.getFilteredSales);
router.delete('/admin/:id', saleController.adminDeleteSale);
router.put('/admin/:id/validity', saleController.toggleSaleValidity);

module.exports = router; 