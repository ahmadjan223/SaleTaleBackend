const jwt = require('jsonwebtoken');
const Salesman = require('../models/salesman.model');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Find salesman by googleId
    const salesman = await Salesman.findOne({ googleId: decoded.googleId });
    
    if (!salesman) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    // Add salesman to request object
    req.salesman = salesman;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = auth; 