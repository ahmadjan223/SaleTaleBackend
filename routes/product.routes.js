const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const adminAuth = require('../middleware/adminAuth');
const auth = require('../middleware/auth');

// Public routes (require salesman auth)
router.get('/', auth, productController.getProducts);
router.get('/:id', auth, productController.getProductById);

// Admin routes (require adminAuth)
router.post('/admin/create', adminAuth, productController.createProduct);
router.put('/admin/:id', adminAuth, productController.updateProduct);
router.delete('/admin/:id', adminAuth, productController.adminDeleteProduct);
router.get('/admin/all', adminAuth, productController.getAllProducts);
router.get('/admin/:id', adminAuth, productController.adminGetProductById);
router.put('/admin/:id/status', adminAuth, productController.toggleProductStatus);

module.exports = router; 