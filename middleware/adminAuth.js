const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const adminAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const admin = await Admin.findOne({ _id: decoded._id });

        if (!admin) {
            return res.status(401).json({ error: 'Admin not found' });
        }

        req.token = token;
        req.admin = admin;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired. Please login again.' });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token. Please login again.' });
        } else {
            return res.status(401).json({ error: 'Please authenticate as admin' });
        }
    }
};

module.exports = adminAuth; 