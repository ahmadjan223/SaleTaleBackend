const Salesman = require('../models/salesman.model');
const jwt = require('jsonwebtoken');

// Create a new salesman
exports.createSalesman = async (req, res) => {
  try {
    console.log("::[CREATING SALESMAN] ", req.body);
    const { name, givenName, familyName, email, password, googleId, photo } = req.body;

    // Check if user already exists
    const existingUser = await Salesman.findOne({ googleId });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this Google ID' });
    }

    // Create new salesman
    const salesman = new Salesman({
      name,
      givenName,
      familyName,
      email,
      password,
      googleId,
      photo,
      verified: false
    });

    await salesman.save();

    // Generate JWT token
    const token = jwt.sign(
      { googleId: salesman.googleId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Salesman created successfully',
      salesman: {
        googleId: salesman.googleId,
        name: salesman.name,
        email: salesman.email,
        verified: salesman.verified
      },
      token
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating salesman', error: error.message });
  }
};

// Login salesman
exports.loginSalesman = async (req, res) => {
  try {
    const { googleId } = req.body;

    // Find salesman by googleId
    const salesman = await Salesman.findOne({ googleId });
    if (!salesman) {
      return res.status(401).json({ message: 'Invalid Google ID' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { googleId: salesman.googleId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      salesman: {
        googleId: salesman.googleId,
        name: salesman.name,
        email: salesman.email,
        verified: salesman.verified
      },
      token
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};

// Get verified salesmen
exports.getVerifiedSalesmen = async (req, res) => {
  try {
    const salesmen = await Salesman.find({ verified: true }).select('-password');
    res.json(salesmen);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching verified salesmen', error: error.message });
  }
};

// Get unverified salesmen
exports.getUnverifiedSalesmen = async (req, res) => {
  try {
    const salesmen = await Salesman.find({ verified: false }).select('-password');
    res.json(salesmen);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching unverified salesmen', error: error.message });
  }
};

// Verify salesman
exports.verifySalesman = async (req, res) => {
  try {
    const { googleId } = req.params;
    const salesman = await Salesman.findOneAndUpdate(
      { googleId },
      { verified: true },
      { new: true }
    ).select('-password');

    if (!salesman) {
      return res.status(404).json({ message: 'Salesman not found' });
    }

    res.json({
      message: 'Salesman verified successfully',
      salesman
    });
  } catch (error) {
    res.status(500).json({ message: 'Error verifying salesman', error: error.message });
  }
};

// Logout salesman
exports.logoutSalesman = async (req, res) => {
  try {
    res.json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ message: 'Error logging out', error: error.message });
  }
};

// Delete salesman
exports.deleteSalesman = async (req, res) => {
  try {
    const { googleId } = req.params;
    const salesman = await Salesman.findOneAndDelete({ googleId });

    if (!salesman) {
      return res.status(404).json({ message: 'Salesman not found' });
    }

    res.json({ message: 'Salesman deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting salesman', error: error.message });
  }
}; 