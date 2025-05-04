const express = require('express');
const router = express.Router();
const salesmanController = require('../controllers/salesman.controller');
const auth = require('../middleware/auth'); // You'll need to create this middleware

// Public routes
router.post('/register', salesmanController.createSalesman);
router.post('/login', salesmanController.loginSalesman);

// Protected routes (require authentication)
router.get('/verified', auth, salesmanController.getVerifiedSalesmen);
router.get('/unverified', auth, salesmanController.getUnverifiedSalesmen);
router.put('/verify/:googleId', auth, salesmanController.verifySalesman);
router.post('/logout', auth, salesmanController.logoutSalesman);
router.delete('/:googleId', auth, salesmanController.deleteSalesman);

module.exports = router; 