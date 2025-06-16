const Salesman = require('../models/salesman.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Sale = require('../models/sale.model');
const Retailer = require('../models/retailer.model');

// Create a new salesman
// exports.createSalesman = async (req, res) => {
//   try {
//     console.log("::[CREATING SALESMAN] Request Body:", req.body);
//     const { name, givenName, familyName, email, password, googleId, photo, phone } = req.body;

//     // Validate required fields
//     if (!phone) {
//       console.error('Phone number is missing in request body');
//       return res.status(400).json({ message: 'Phone number is required' });
//     }

//     // Check if user already exists
//     const existingUser = await Salesman.findOne({ googleId });
//     if (existingUser) {
//       return res.status(400).json({ message: 'User already exists with this Google ID' });
//     }

//     // Create new salesman
//     const salesman = new Salesman({
//       name,
//       givenName,
//       familyName,
//       email,
//       password,
//       googleId,
//       photo,
//       phone,
//       verified: false
//     });

//     console.log("::[CREATING SALESMAN] Salesman object:", salesman);

//     await salesman.save();
//     console.log("::[CREATING SALESMAN] Salesman saved successfully");

//     // Generate JWT token
//     const token = jwt.sign(
//       { googleId: salesman.googleId },
//       process.env.JWT_SECRET || 'your-secret-key',
//       { expiresIn: '24h' }
//     );

//     res.status(201).json({
//       message: 'Salesman created successfully',
//       salesman: {
//         googleId: salesman.googleId,
//         name: salesman.name,
//         email: salesman.email,
//         verified: salesman.verified
//       },
//       token
//     });
//   } catch (error) {
//     console.error('Error creating salesman:', error);
//     console.error('Error details:', {
//       message: error.message,
//       stack: error.stack,
//       validationErrors: error.errors
//     });
//     res.status(500).json({ 
//       message: 'Error creating salesman', 
//       error: error.message,
//       validationErrors: error.errors
//     });
//   }
// };

// Login salesman
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    console.log('Login attempt for:', identifier);

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both identifier (email/contactNo) and password'
      });
    }

    // First try to find by email
    let salesman = await Salesman.findOne({ email: identifier.toLowerCase() });
    
    // If not found by email, try contact number
    if (!salesman) {
      salesman = await Salesman.findOne({ contactNo: identifier });
    }

    if (!salesman) {
      console.log('No salesman found for:', identifier);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('Found salesman:', salesman.email);

    // Check password
    const isMatch = await bcrypt.compare(password, salesman.password);
    console.log('Password match:', isMatch);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        _id: salesman._id,
        email: salesman.email,
        name: salesman.name
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Remove password from response
    const salesmanResponse = salesman.toObject();
    delete salesmanResponse.password;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        salesman: salesmanResponse,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login',
      error: error.message
    });
  }
};

// Get active salesmen
exports.getActiveSalesmen = async (req, res) => {
  try {
    const salesmen = await Salesman.find({ active: true }).select('-password');
    res.json(salesmen);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching active salesmen', error: error.message });
  }
};

exports.getAllSalesmen = async (req, res) => {
  try {
    const salesmen = await Salesman.find({})
      .select('-password')
      .populate('franchise', 'name address masterSimNo active');
    console.log('[GET ALL SALESMEN]');
    salesmen.forEach(salesman => {
      console.log(`[${salesman.name} ${salesman.email}]`);
    });
    res.json(salesmen);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching salesmen', error: error.message });
  }
};

// Get inactive salesmen
exports.getInactiveSalesmen = async (req, res) => {
  try {
    const salesmen = await Salesman.find({ active: false }).select('-password');
    res.json(salesmen);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching inactive salesmen', error: error.message });
  }
};

// Activate/deactivate salesman
exports.toggleSalesmanStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    if (typeof active !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Active status must be a boolean value'
      });
    }

    const salesman = await Salesman.findByIdAndUpdate(
      id,
      { active },
      { new: true }
    ).select('-password');

    if (!salesman) {
      return res.status(404).json({
        success: false,
        message: 'Salesman not found'
      });
    }

    res.json({
      success: true,
      message: `Salesman ${active ? 'activated' : 'deactivated'} successfully`,
      data: salesman
    });

  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating salesman status',
      error: error.message
    });
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
    // Only delete the salesman document, don't cascade to sales
    const salesman = await Salesman.findOneAndDelete({ googleId });

    if (!salesman) {
      return res.status(404).json({ message: 'Salesman not found' });
    }

    // Log the deletion but keep sales data intact
    console.log(`[DELETED SALESMAN] ID: ${salesman._id}, Name: ${salesman.name}, Email: ${salesman.email}`);
    console.log('[NOTE] Associated sales data has been preserved');

    res.json({ 
      message: 'Salesman deleted successfully. Associated sales data has been preserved.',
      deletedSalesman: {
        id: salesman._id,
        name: salesman.name,
        email: salesman.email
      }
    });
  } catch (error) {
    console.error('[ERROR] Delete salesman error:', error);
    res.status(500).json({ message: 'Error deleting salesman', error: error.message });
  }
};

// Admin Delete Salesman (uses _id from req.params.id)
exports.adminDeleteSalesman = async (req, res) => {
  try {
    const salesmanId = req.params.id;
    console.log(`\n[ADMIN DELETE SALESMAN] ID: ${salesmanId}`);

    // Start a session for transaction
    const session = await Salesman.startSession();
    session.startTransaction();

    try {
      // Delete all sales associated with this salesman
      const deletedSales = await Sale.deleteMany({ addedBy: salesmanId }, { session });
      console.log(`[ADMIN] Deleted ${deletedSales.deletedCount} sales associated with salesman`);

      // Delete all retailers associated with this salesman
      const deletedRetailers = await Retailer.deleteMany({ addedBy: salesmanId }, { session });
      console.log(`[ADMIN] Deleted ${deletedRetailers.deletedCount} retailers associated with salesman`);

      // Delete the salesman
      const salesman = await Salesman.findByIdAndDelete(salesmanId, { session });

      if (!salesman) {
        await session.abortTransaction();
        console.log('[ERROR] Salesman not found for admin deletion');
        return res.status(404).json({ message: 'Salesman not found' });
      }

      await session.commitTransaction();
      console.log(`[ADMIN] Salesman [${salesman.name}, ${salesman.email}] and all associated data deleted successfully`);

      res.json({ 
        message: 'Salesman and all associated data deleted successfully by admin',
        deletedSalesman: {
          id: salesman._id,
          name: salesman.name,
          email: salesman.email
        },
        deletedSalesCount: deletedSales.deletedCount,
        deletedRetailersCount: deletedRetailers.deletedCount
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
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
    const salesman = await Salesman.findById(salesmanId)
      .select('-password')
      .populate('franchise', 'name address masterSimNo active');

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

// Register a new salesman
exports.register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      contactNo,
      contactNo2,
      email,
      password
    } = req.body;

    // Validate password length
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if salesman already exists
    const existingSalesman = await Salesman.findOne({ email });
    if (existingSalesman) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create new salesman
    const salesman = new Salesman({
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      contactNo,
      contactNo2,
      email,
      password
    });

    // Save salesman
    await salesman.save();

    // Remove password from response
    const salesmanResponse = salesman.toObject();
    delete salesmanResponse.password;

    res.status(201).json({
      success: true,
      message: 'Salesman registered successfully',
      data: salesmanResponse
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering salesman',
      error: error.message
    });
  }
};

// Update salesman details
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Don't allow updating certain fields
    delete updateData.password;
    delete updateData.id;
    delete updateData.email; // Email should be updated through a separate endpoint
    delete updateData.verified;

    // If name fields are updated, update the full name
    if (updateData.firstName || updateData.lastName) {
      const salesman = await Salesman.findById(id);
      if (!salesman) {
        return res.status(404).json({
          success: false,
          message: 'Salesman not found'
        });
      }
      updateData.name = `${updateData.firstName || salesman.firstName} ${updateData.lastName || salesman.lastName}`;
    }

    const updatedSalesman = await Salesman.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedSalesman) {
      return res.status(404).json({
        success: false,
        message: 'Salesman not found'
      });
    }

    // Remove password from response
    const salesmanResponse = updatedSalesman.toObject();
    delete salesmanResponse.password;

    res.status(200).json({
      success: true,
      message: 'Salesman updated successfully',
      data: salesmanResponse
    });

  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating salesman',
      error: error.message
    });
  }
};

// Admin Create Salesman
exports.adminCreateSalesman = async (req, res) => {
  try {
    console.log('\n[ADMIN CREATE SALESMAN] Request Body:', req.body);
    const {
      firstName,
      lastName,
      contactNo,
      contactNo2,
      email,
      password,
      franchise
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !contactNo || !email || !password) {
      console.log('[ERROR] Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        required: ['firstName', 'lastName', 'contactNo', 'email', 'password']
      });
    }

    // Validate password length
    if (password.length < 6) {
      console.log('[ERROR] Password too short');
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if salesman already exists
    const existingSalesman = await Salesman.findOne({ email });
    if (existingSalesman) {
      console.log('[ERROR] Email already registered:', email);
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create new salesman
    const salesman = new Salesman({
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      contactNo,
      contactNo2,
      email,
      password,
      active: true,
      ...(franchise && { franchise }) // Only include franchise if it exists
    });

    console.log('[ADMIN CREATE SALESMAN] Salesman object:', salesman);

    // Save salesman
    await salesman.save();
    console.log('[ADMIN CREATE SALESMAN] Salesman saved successfully');

    // Remove password from response
    const salesmanResponse = salesman.toObject();
    delete salesmanResponse.password;

    res.status(201).json({
      success: true,
      message: 'Salesman created successfully by admin',
      data: salesmanResponse
    });

  } catch (error) {
    console.error('[ERROR] Admin create salesman error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      validationErrors: error.errors
    });
    res.status(500).json({
      success: false,
      message: 'Error creating salesman',
      error: error.message,
      validationErrors: error.errors
    });
  }
};

// Admin Update Salesman
exports.adminUpdateSalesman = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    console.log(`\n[ADMIN UPDATE SALESMAN] ID: ${id}, Update Data:`, updateData);

    // Don't allow updating certain fields
    delete updateData.password;
    delete updateData.id;
    delete updateData.email; // Email should be updated through a separate endpoint
    delete updateData.verified;

    // If name fields are updated, update the full name
    if (updateData.firstName || updateData.lastName) {
      const salesman = await Salesman.findById(id);
      if (!salesman) {
        console.log('[ERROR] Salesman not found for update');
        return res.status(404).json({
          success: false,
          message: 'Salesman not found'
        });
      }
      updateData.name = `${updateData.firstName || salesman.firstName} ${updateData.lastName || salesman.lastName}`;
    }

    // Ensure franchise is included in the update if provided
    if (updateData.franchise) {
      updateData.franchise = updateData.franchise;
    }

    const updatedSalesman = await Salesman.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedSalesman) {
      console.log('[ERROR] Salesman not found after update attempt');
      return res.status(404).json({
        success: false,
        message: 'Salesman not found'
      });
    }

    console.log(`[ADMIN] Updated Salesman: [${updatedSalesman.name}, ${updatedSalesman.email}]`);
    res.status(200).json({
      success: true,
      message: 'Salesman updated successfully',
      data: updatedSalesman
    });

  } catch (error) {
    console.error('[ERROR] Admin update salesman error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating salesman',
      error: error.message
    });
  }
}; 



