const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const { setupAdmin, loginAdmin, getAdminProfile, logoutAdmin } = require('../controllers/adminController');

// Initial admin setup (should be called only once)
router.post('/setup', setupAdmin);

// Admin login
router.post('/login', loginAdmin);

// Get admin profile
router.get('/profile', adminAuth, getAdminProfile);

// Admin logout
router.post('/logout', adminAuth, logoutAdmin);

module.exports = router; 