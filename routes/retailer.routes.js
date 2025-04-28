const express = require('express');
const router = express.Router();
const retailerController = require('../controllers/retailer.controller');

router.post('/', retailerController.createRetailer);
router.get('/', retailerController.getRetailers);
router.get('/nearby', retailerController.getRetailersByLocation);
router.get('/:id', retailerController.getRetailerById);
router.put('/:id', retailerController.updateRetailer);
router.delete('/:id', retailerController.deleteRetailer);

module.exports = router; 