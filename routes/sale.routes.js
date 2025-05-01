const express = require('express');
const router = express.Router();
const saleController = require('../controllers/sale.controller');

router.post('/', saleController.createSale);
router.get('/', saleController.getSales);
router.get('/retailer/:retailerId', saleController.getRetailerSales);
router.delete('/delete/:id', saleController.deleteSale);
router.put('/update/:id', saleController.updateSale);

module.exports = router; 