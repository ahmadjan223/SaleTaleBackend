const Salesman = require('../models/salesman.model');
const jwt = require('jsonwebtoken');

// Create a new salesman
exports.createSalesman = async (req, res) => {
  try {
    console.log("::[CREATING SALESMAN] Request Body:", req.body);
    const { name, givenName, familyName, email, password, googleId, photo, phone } = req.body;

    // Validate required fields
    if (!phone) {
      console.error('Phone number is missing in request body');
      return res.status(400).json({ message: 'Phone number is required' });
    }

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
      phone,
      verified: false
    });

    console.log("::[CREATING SALESMAN] Salesman object:", salesman);

    await salesman.save();
    console.log("::[CREATING SALESMAN] Salesman saved successfully");

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
    console.error('Error creating salesman:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      validationErrors: error.errors
    });
    res.status(500).json({ 
      message: 'Error creating salesman', 
      error: error.message,
      validationErrors: error.errors
    });
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
exports.getAllSalesmen = async (req, res) => {
  try {
    const salesmen = await Salesman.find({}).select('-password');
    console.log('[GET ALL SALESMEN]');
    salesmen.forEach(salesman => {
      console.log(`[${salesman.name} ${salesman.email}]`);
    });
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

// Admin Delete Salesman (uses _id from req.params.id)
exports.adminDeleteSalesman = async (req, res) => {
  try {
    const salesmanId = req.params.id; // Expecting MongoDB _id
    console.log(`\n[ADMIN DELETE SALESMAN] ID: ${salesmanId}`);

    const salesman = await Salesman.findByIdAndDelete(salesmanId);

    if (!salesman) {
      console.log('[ERROR] Salesman not found for admin deletion');
      return res.status(404).json({ message: 'Salesman not found' });
    }

    console.log(`[ADMIN] Salesman [${salesman.name}, ${salesman.email}] deleted successfully`);
    res.json({ message: 'Salesman deleted successfully by admin' });
  } catch (error) {
    console.log('[ERROR] Admin deleting salesman:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// Admin Get Salesman By ID
exports.adminGetSalesmanById = async (req, res) => {
  try {
    const salesmanId = req.params.id; // Expecting MongoDB _id
    console.log(`\n[ADMIN GET SALESMAN BY ID] ID: ${salesmanId}`);

    // Select fields relevant for a tooltip or quick view, e.g., name, email, phone, verified
    const salesman = await Salesman.findById(salesmanId).select('name email phone verified _id');

    if (!salesman) {
      console.log('[ERROR] Salesman not found for admin view by ID');
      return res.status(404).json({ message: 'Salesman not found' });
    }

    console.log(`[ADMIN] Fetched Salesman: [${salesman.name}, ${salesman.email}]`);
    res.json(salesman);
  } catch (error) {
    console.log('[ERROR] Admin fetching salesman by ID:', error.message);
    res.status(500).json({ message: error.message });
  }
}; 