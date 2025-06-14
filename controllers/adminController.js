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

        const token = jwt.sign({ _id: admin._id.toString() }, process.env.JWT_SECRET || 'your-secret-key');
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

        const token = jwt.sign({ _id: admin._id.toString() }, process.env.JWT_SECRET || 'your-secret-key');
        res.json({ admin, token });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get admin profile
const getAdminProfile = async (req, res) => {
    res.json(req.admin);
};

module.exports = {
    setupAdmin,
    loginAdmin,
    getAdminProfile
}; 