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
    console.log('Decoded Token:', decoded);  // Add a log to check the token content
    
    // Find salesman by googleId
    const salesman = await Salesman.findOne({ googleId: decoded.googleId });
    console.log('Salesman found:', salesman);  // Log the found salesman to ensure it is correct
    
    if (!salesman) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    // Add salesman to request object
    req.salesman = salesman;  // This attaches the salesman to the request object
    next();
  } catch (error) {
    console.log('Error in auth middleware:', error.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = auth;
