const Salesman = require('../models/salesman.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Sale = require('../models/sale.model');
const Retailer = require('../models/retailer.model');
const fs = require('fs');
const { parse } = require('csv-parse');
const Franchise = require('../models/franchise.model');

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
    let salesman = await Salesman.findOne({ email: identifier.toLowerCase() }).populate('franchise');
    
    // If not found by email, try contact number
    if (!salesman) {
      salesman = await Salesman.findOne({ contactNo: identifier }).populate('franchise');
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

    // If password is being updated, assign directly (let pre-save hook hash it)
    if (updateData.password) {
      const salesman = await Salesman.findById(id);
      if (!salesman) {
        return res.status(404).json({
          success: false,
          message: 'Salesman not found'
        });
      }
      salesman.password = updateData.password;
      // Assign other updatable fields
      Object.keys(updateData).forEach(key => {
        if (key !== 'password') {
          salesman[key] = updateData[key];
        }
      });
      await salesman.save();
      const salesmanResponse = salesman.toObject();
      delete salesmanResponse.password;
      return res.status(200).json({
        success: true,
        message: 'Salesman updated successfully',
        data: salesmanResponse
      });
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
      message: 'Error updating salesman check form values',
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
      message: 'Error creating salesman check form values',
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

    // Only update password if it is non-empty and not just whitespace
    if (typeof updateData.password === 'string' && updateData.password.trim() !== '') {
      console.log(`[ADMIN UPDATE SALESMAN] New password (plain): ${updateData.password}`);
      updateData.password = await bcrypt.hash(updateData.password, 10);
      console.log(`[ADMIN UPDATE SALESMAN] New password (hashed): ${updateData.password}`);
    } else {
      delete updateData.password;
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
      message: 'Error updating salesman check form value',
      error: error.message
    });
  }
};

// Get filtered salesmen
exports.getFilteredSalesmen = async (req, res) => {
  try {
    const {
      name,
      email,
      contactNo,
      franchise,
      active,
      startDate,
      endDate
    } = req.query;

    // Build filter object
    const filter = {};
    
    // Text search filters
    if (name) {
      filter.$or = [
        { firstName: { $regex: name, $options: 'i' } },
        { lastName: { $regex: name, $options: 'i' } },
        { name: { $regex: name, $options: 'i' } }
      ];
    }
    
    if (email) {
      filter.email = { $regex: email, $options: 'i' };
    }
    
    if (contactNo) {
      filter.contactNo = { $regex: contactNo, $options: 'i' };
    }

    // Franchise filter
    if (franchise) {
      filter.franchise = franchise;
    }

    // Active status filter
    if (active !== undefined) {
      filter.active = active === 'true';
    }
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Execute query with filters
    const salesmen = await Salesman.find(filter)
      .select('-password')
      .populate('franchise', 'name address masterSimNo active')
      .sort({ createdAt: -1 });

    console.log('\n::[GET FILTERED SALESMEN]');
    console.log('Filters applied:', {
      name,
      email,
      contactNo,
      franchise,
      active,
      startDate,
      endDate
    });
    console.log(`Found ${salesmen.length} salesmen matching the criteria`);

    res.json(salesmen);
  } catch (error) {
    console.log('::[ERROR] Get filtered salesmen error:', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: error.message });
  }
};

exports.uploadSalesmenCSV = async (req, res) => {
  console.log('\n[UPLOAD SALESMEN CSV] Starting CSV upload process');
  try {
    if (!req.file) {
      console.log('[ERROR] No file uploaded');
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded' 
      });
    }

    console.log('[INFO] File received:', {
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size
    });

    // Ensure uploads directory exists
    const uploadsDir = 'uploads';
    if (!fs.existsSync(uploadsDir)) {
      console.log('[INFO] Creating uploads directory');
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const salesmen = [];
    const errors = [];
    let successCount = 0;

    console.log('[INFO] Starting CSV parsing');
    // Create a parser for the CSV file
    const parser = fs.createReadStream(req.file.path)
      .pipe(parse({
        columns: true,
        skip_empty_lines: true,
        trim: true
      }));

    console.log('[INFO] Processing CSV rows');
    // Process each row in the CSV
    for await (const record of parser) {
      try {
        console.log('[INFO] Processing row:', record);
        // Validate required fields
        const missingFields = [];
        if (!record.firstName) missingFields.push('firstName');
        if (!record.lastName) missingFields.push('lastName');
        if (!record.contactNo) missingFields.push('contactNo');
        if (!record.email) missingFields.push('email');
        if (!record.password) missingFields.push('password');
        if (!record.franchise) missingFields.push('franchise');

        if (missingFields.length > 0) {
          const error = `Missing required fields: ${missingFields.join(', ')}`;
          console.log('[ERROR]', error);
          errors.push({
            row: record,
            error: error
          });
          continue;
        }

        // Validate contact numbers are numeric
        if (!/^\d+$/.test(record.contactNo)) {
          const error = `Invalid contact number format: ${record.contactNo}`;
          console.log('[ERROR]', error);
          errors.push({
            row: record,
            error: error
          });
          continue;
        }

        if (record.contactNo2 && !/^\d+$/.test(record.contactNo2)) {
          const error = `Invalid secondary contact number format: ${record.contactNo2}`;
          console.log('[ERROR]', error);
          errors.push({
            row: record,
            error: error
          });
          continue;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(record.email)) {
          const error = `Invalid email format: ${record.email}`;
          console.log('[ERROR]', error);
          errors.push({
            row: record,
            error: error
          });
          continue;
        }

        // Check if email or contact number already exists
        console.log('[INFO] Checking for existing salesman with email:', record.email);
        const existingSalesman = await Salesman.findOne({
          $or: [
            { email: record.email.toLowerCase() },
            { contactNo: record.contactNo },
            { contactNo2: record.contactNo }
          ]
        });

        if (existingSalesman) {
          console.log('[INFO] Skipping duplicate entry:', record.email);
          continue; // Skip this record without adding to errors
        }

        // Verify franchise exists
        console.log('[INFO] Verifying franchise:', record.franchise);
        const franchise = await Franchise.findById(record.franchise);
        if (!franchise) {
          const error = `Invalid franchise ID: ${record.franchise}`;
          console.log('[ERROR]', error);
          errors.push({
            row: record,
            error: error
          });
          continue;
        }

        // Create salesman object
        console.log('[INFO] Creating salesman object for:', record.email);
        const salesman = new Salesman({
          firstName: record.firstName,
          lastName: record.lastName,
          name: `${record.firstName} ${record.lastName}`,
          contactNo: record.contactNo,
          contactNo2: record.contactNo2 || '',
          email: record.email.toLowerCase(),
          password: record.password,
          franchise: record.franchise,
          active: true
        });

        console.log('[INFO] Saving salesman:', record.email);
        await salesman.save();
        successCount++;
        salesmen.push(salesman);
        console.log('[SUCCESS] Saved salesman:', record.email);
      } catch (error) {
        console.error('[ERROR] Error processing row:', error);
        errors.push({
          row: record,
          error: error.message || 'Unknown error processing row'
        });
      }
    }

    // Clean up the uploaded file
    try {
      console.log('[INFO] Cleaning up temporary file');
      fs.unlinkSync(req.file.path);
    } catch (error) {
      console.error('[ERROR] Error deleting temporary file:', error);
    }

    console.log('[SUCCESS] CSV processing completed', {
      successCount,
      errorCount: errors.length
    });

    // Return detailed response
    return res.json({
      success: true,
      message: 'CSV processing completed',
      summary: {
        totalProcessed: successCount + errors.length,
        successCount,
        errorCount: errors.length
      },
      errors: errors.length > 0 ? errors : undefined,
      salesmen: salesmen.map(s => ({
        id: s._id,
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        contactNo: s.contactNo
      }))
    });

  } catch (error) {
    console.error('[ERROR] CSV Upload failed:', error);
    console.error('[ERROR] Stack trace:', error.stack);
    
    // Clean up the uploaded file if it exists
    if (req.file && req.file.path) {
      try {
        console.log('[INFO] Cleaning up file after error');
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('[ERROR] Error cleaning up file:', cleanupError);
      }
    }

    // Return detailed error response
    return res.status(500).json({ 
      success: false,
      message: 'Error processing CSV file',
      error: error.message,
      details: {
        name: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
};

// Edit profile for logged-in salesman
exports.profileEdit = async (req, res) => {
  try {
    const salesmanId = req.salesman._id;
    const { email, contactNo, contactNo2, newPassword, currentPassword } = req.body;

    // Find the salesman
    const salesman = await Salesman.findById(salesmanId);
    if (!salesman) {
      return res.status(404).json({ success: false, message: 'Salesman not found' });
    }

    // Verify current password only for email/contact updates (not for password update)
    if ((email || contactNo || contactNo2 !== undefined) && currentPassword) {
      const isMatch = await bcrypt.compare(currentPassword, salesman.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect' });
      }
    }

    // Update fields if provided
    if (email && email !== salesman.email) {
      salesman.email = email;
    }
    if (contactNo && contactNo !== salesman.contactNo) {
      salesman.contactNo = contactNo;
    }
    if (contactNo2 !== undefined && contactNo2 !== salesman.contactNo2) {
      salesman.contactNo2 = contactNo2;
    }
    if (newPassword) {
      salesman.password = newPassword; // Do NOT hash here! Let pre-save hook handle it.
    }

    await salesman.save();
    const updatedSalesman = await Salesman.findById(salesmanId).select('-password').populate('franchise');
    res.json({ success: true, message: 'Profile updated successfully', data: updatedSalesman });
  } catch (error) {
    console.error('Profile edit error:', error);
    res.status(500).json({ success: false, message: 'Error updating profile', error: error.message });
  }
}; 



