const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Initial admin setup
const setupAdmin = async (req, res) => {
    try {
        // Check if admin already exists
        const adminExists = await Admin.findOne();
        if (adminExists) {
            return res.status(400).json({ error: 'Admin already exists' });
        }

        const { email, phone, password } = req.body;
        
        // Validate input
        if (!email || !phone || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const admin = new Admin({ email, phone, password });
        await admin.save();

        const token = jwt.sign(
            { _id: admin._id.toString() }, 
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1d' }
        );
        res.status(201).json({ admin, token });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Admin login
const loginAdmin = async (req, res) => {
    try {
        const { identifier, password } = req.body;
        
        if (!identifier || !password) {
            return res.status(400).json({ error: 'Please provide identifier and password' });
        }

        // Find admin by email or phone
        const admin = await Admin.findOne({
            $or: [
                { email: identifier },
                { phone: identifier }
            ]
        });

        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { _id: admin._id.toString() }, 
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1d' }
        );
        res.json({ admin, token });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get admin profile
const getAdminProfile = async (req, res) => {
    try {
        // Decode the token to get expiration info
        const token = req.token;
        const decoded = jwt.decode(token);
        
        const adminData = {
            _id: req.admin._id,
            email: req.admin.email,
            phone: req.admin.phone,
            createdAt: req.admin.createdAt,
            updatedAt: req.admin.updatedAt,
            tokenExpiresAt: decoded.exp ? new Date(decoded.exp * 1000) : null
        };
        
        res.json(adminData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Admin logout
const logoutAdmin = async (req, res) => {
    try {
        // The token is already validated by the adminAuth middleware
        // We just need to send a success response
        res.json({ message: 'Logout successful' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update admin email
const updateAdminEmail = async (req, res) => {
    try {
        const { email, currentPassword } = req.body;
        
        if (!email || !currentPassword) {
            return res.status(400).json({ error: 'Email and current password are required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Please provide a valid email address' });
        }

        // Verify current password
        const isMatch = await req.admin.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Check if email already exists
        const existingAdmin = await Admin.findOne({ email, _id: { $ne: req.admin._id } });
        if (existingAdmin) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        // Update email
        req.admin.email = email;
        await req.admin.save();

        res.json({ message: 'Email updated successfully', admin: req.admin });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Update admin phone
const updateAdminPhone = async (req, res) => {
    try {
        const { phone, currentPassword } = req.body;
        
        if (!phone || !currentPassword) {
            return res.status(400).json({ error: 'Phone and current password are required' });
        }

        // Verify current password
        const isMatch = await req.admin.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Check if phone already exists
        const existingAdmin = await Admin.findOne({ phone, _id: { $ne: req.admin._id } });
        if (existingAdmin) {
            return res.status(400).json({ error: 'Phone number already exists' });
        }

        // Update phone
        req.admin.phone = phone;
        await req.admin.save();

        res.json({ message: 'Phone number updated successfully', admin: req.admin });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Update admin password
const updateAdminPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }

        // Validate new password strength
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters long' });
        }

        // Verify current password
        const isMatch = await req.admin.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Update password
        req.admin.password = newPassword;
        await req.admin.save();

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Validate admin password
const validateAdminPassword = async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }
        const isMatch = await req.admin.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid password' });
        }
        res.json({ message: 'Password is valid' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    setupAdmin,
    loginAdmin,
    getAdminProfile,
    logoutAdmin,
    updateAdminEmail,
    updateAdminPhone,
    updateAdminPassword,
    validateAdminPassword
}; 