const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const { 
    setupAdmin, 
    loginAdmin, 
    getAdminProfile, 
    logoutAdmin,
    updateAdminEmail,
    updateAdminPhone,
    updateAdminPassword,
    adminUploadSalesCSV
} = require('../controllers/adminController');
// Initial admin setup (should be called only once)
router.post('/setup', setupAdmin);

// Admin login
router.post('/login', loginAdmin);

// Get admin profile
router.get('/profile', adminAuth, getAdminProfile);

// Admin logout
router.post('/logout', adminAuth, logoutAdmin);

// Update admin credentials (all require authentication)
router.put('/update-email', adminAuth, updateAdminEmail);
router.put('/update-phone', adminAuth, updateAdminPhone);
router.put('/update-password', adminAuth, updateAdminPassword);

// Add the route


module.exports = router; 