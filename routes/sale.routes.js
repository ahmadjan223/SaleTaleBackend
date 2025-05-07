const express = require('express');
const router = express.Router();
const saleController = require('../controllers/sale.controller');
const auth = require('../middleware/auth');

router.post('/',auth,    saleController.createSale);
router.get('/',auth, saleController.getSales);
router.get('/retailer/:retailerId',auth, saleController.getRetailerSales);
router.delete('/:id',auth, saleController.deleteSale);
router.put('/:id',auth, saleController.updateSale);

module.exports = router; 