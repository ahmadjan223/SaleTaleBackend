const express = require('express');
const router = express.Router();
const saleController = require('../controllers/sale.controller');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const statisticsController = require('../controllers/statistics.controller');

// Salesman statistics route (must be before any :id route)
router.get('/statistics', auth, statisticsController.getSalesmanStatistics);

// Salesman specific routes (require auth)
router.post('/', auth, saleController.createSale);  
router.get('/', auth, saleController.getSales);
router.get('/retailer/:retailerId', auth, saleController.getRetailerSales);
router.get('/:id', auth, saleController.getSale);
router.put('/:id', auth, saleController.updateSale);
router.delete('/:id', auth, saleController.deleteSale);

// Admin routes (with adminAuth)
router.get('/admin/all', adminAuth, saleController.getAllSales);
router.get('/admin/filtered', adminAuth, saleController.getFilteredSales);
router.post('/admin/create', adminAuth, saleController.adminCreateSale);
router.delete('/admin/:id', adminAuth, saleController.adminDeleteSale);
router.put('/admin/:id/validity', adminAuth, saleController.toggleSaleValidity);
router.post('/admin/upload-csv', adminAuth, upload.single('file'), saleController.adminUploadSalesCSV);

module.exports = router; 