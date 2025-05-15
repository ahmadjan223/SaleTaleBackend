const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
// const auth = require('../middleware/auth'); // Add if non-admin routes need auth
// const adminAuth = require('../middleware/adminAuth'); // Add if admin routes need specific auth

// Non-admin routes (add auth if needed)
router.post('/', productController.createProduct); // Consider if this should be admin-only or authed
router.get('/', productController.getProducts); // General get all, might be same as admin/all or paginated
router.get('/:id', productController.getProductById);
// Add other non-admin routes like PUT for update here if necessary

// Admin specific routes
router.get('/admin/all', productController.getAllProducts); // Uses getAllProducts from controller
router.delete('/admin/:id', productController.adminDeleteProduct);

module.exports = router; 