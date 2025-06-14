const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');

// Public routes
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);

// Admin routes (without auth for now)
router.post('/admin/create', productController.createProduct);
router.put('/admin/:id', productController.updateProduct);
router.delete('/admin/:id', productController.adminDeleteProduct);
router.get('/admin/all', productController.getAllProducts);
router.get('/admin/:id', productController.adminGetProductById);
router.put('/admin/:id/status', productController.toggleProductStatus);

module.exports = router; 