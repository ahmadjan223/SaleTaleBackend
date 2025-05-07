const express = require('express');
const router = express.Router();
const retailerController = require('../controllers/retailer.controller');
const auth = require('../middleware/auth'); // You'll need to create this middleware


router.post('/', auth, retailerController.createRetailer);
router.get('/', auth, retailerController.getRetailers);
router.get('/nearby', auth, retailerController.getRetailersByLocation);
router.get('/:id', auth, retailerController.getRetailerById);
router.put('/:id', auth, retailerController.updateRetailer);
router.delete('/:id', auth, retailerController.deleteRetailer);

module.exports = router; 