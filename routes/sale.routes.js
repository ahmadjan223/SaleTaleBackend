const express = require('express');
const router = express.Router();
const saleController = require('../controllers/sale.controller');

router.post('/', saleController.createSale);
router.get('/', saleController.getSales);
router.get('/retailer/:retailerId', saleController.getRetailerSales);

module.exports = router; 