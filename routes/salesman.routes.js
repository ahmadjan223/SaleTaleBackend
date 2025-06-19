const express = require('express');
const router = express.Router();
const salesmanController = require('../controllers/salesman.controller');
const auth = require('../middleware/auth'); // You'll need to create this middleware
const adminAuth = require('../middleware/adminAuth');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Public routes
router.post('/register', salesmanController.register);
router.post('/login', salesmanController.login);

// Protected routes (require general auth)
router.get('/active', auth, salesmanController.getActiveSalesmen);
router.get('/inactive', auth, salesmanController.getInactiveSalesmen);
router.post('/logout', auth, salesmanController.logoutSalesman);
router.delete('/:id', auth, salesmanController.deleteSalesman);

// Admin specific routes (require adminAuth)
router.get('/admin/all', adminAuth, salesmanController.getAllSalesmen);
router.get('/admin/filtered', adminAuth, salesmanController.getFilteredSalesmen);
// Admin delete salesman uses _id in param, not googleId like the other delete route
router.delete('/admin/:id', adminAuth, salesmanController.adminDeleteSalesman);
router.get('/admin/details/:id', adminAuth, salesmanController.adminGetSalesmanById);
// Admin create and update salesman
router.post('/admin/create', adminAuth, salesmanController.adminCreateSalesman);
router.put('/admin/:id', adminAuth, salesmanController.adminUpdateSalesman);
// Admin toggle salesman status
router.put('/admin/:id/status', adminAuth, salesmanController.toggleSalesmanStatus);

// Update salesman details (protected route)
router.put('/:id', auth, salesmanController.update);

// Profile edit route (protected, for self-edit)
router.post('/profile/edit', auth, salesmanController.profileEdit);

// Admin specific routes
router.post('/admin/upload-csv', adminAuth, upload.single('file'), salesmanController.uploadSalesmenCSV);

module.exports = router; 