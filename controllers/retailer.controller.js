const Retailer = require('../models/retailer.model');
const Sale = require('../models/sale.model');
const fs = require('fs');
const { parse } = require('csv-parse');
const Salesman = require('../models/salesman.model');

exports.getRetailers = async (req, res) => {
  try {
    const userId = req.salesman._id;
    console.log(`\n[GET RETAILERS] Assigned Salesman: ${userId}`);

    const retailers = await Retailer.find({ assignedSalesman: userId })
      .select('retailerName shopName contactNo contactNo2 address location createdAt addedBy active assignedSalesman')
      .populate('addedBy', 'name email contactNo active')
      .populate('assignedSalesman', 'name email contactNo active');

    retailers.forEach(r => {
      console.log(`[${r.retailerName}, ${r.shopName}, ${r.contactNo}, ${r.contactNo2}, ${r.address}, [${r.location.coordinates}], Assigned to: ${req.salesman.email}]`);
    });

    res.json(retailers);
  } catch (error) {
    console.log('[ERROR]', error.message);
    res.status(500).json({ message: error.message });
  }
};

exports.getAllRetailers = async (req, res) => {
  try {
    console.log(`\n[GET ALL RETAILERS]`);

    const retailers = await Retailer.find({})
      .select('retailerName shopName contactNo contactNo2 address location createdAt addedBy active assignedSalesman')
      .populate('addedBy', 'name email contactNo active')
      .populate('assignedSalesman', 'name email contactNo active franchise');

    retailers.forEach(r => {
      console.log(`[${r.retailerName}, ${r.shopName}, [${r.location.coordinates}]]`);
    });

    res.json(retailers);
  } catch (error) {
    console.log('[ERROR]', error.message);
    res.status(500).json({ message: error.message });
  }
};

exports.createRetailer = async (req, res) => {
  try {
    console.log('\n[CREATE RETAILER]');

    // Check if salesman is attached to the request object
    if (!req.salesman) {
      console.log('[ERROR] Salesman not found in request');
      return res.status(401).json({ message: 'Salesman not authorized' });
    }

    // Destructure necessary fields from the request body
    const { retailerName, shopName, contactNo, contactNo2, address, location, assignedSalesman } = req.body;

    // Check for missing required fields
    if (!retailerName || !shopName || !contactNo || !address || !location || !location.coordinates) {
      console.log('[ERROR] Missing required fields');
      return res.status(400).json({
        message: 'Missing required fields',
        required: ['retailerName', 'shopName', 'contactNo', 'address', 'location (with coordinates: [longitude, latitude])']
      });
    }
    console.log("id of salesman decoder from jwt token", req.salesman._id)
    // Create a new retailer object
    const retailer = new Retailer({
      retailerName,
      shopName,
      contactNo,
      contactNo2,
      address,
      location,
      // If assignedSalesman is provided (admin case), use that for both fields
      // Otherwise (salesman case), use the current salesman's ID for both fields
      assignedSalesman: assignedSalesman || req.salesman._id,
      addedBy: assignedSalesman || req.salesman._id,
      active: true
    });

    // Save the retailer to the database
    await retailer.save();

    // Log the retailer details for debugging
    console.log(`[${retailer.retailerName}, ${retailer.shopName}, ${retailer.contactNo}, ${retailer.address}, [${retailer.location.coordinates}], Added by ID: ${req.salesman.email}]`);

    // Send the retailer data as the response
    res.status(201).json(retailer);
  } catch (error) {
    console.log('[ERROR]', error.message);
    res.status(400).json({ message: error.message });
  }
};

exports.getRetailerById = async (req, res) => {
  try {
    console.log('\n[GET RETAILER BY ID]', req.params.id);

    const retailer = await Retailer.findOne({
      _id: req.params.id,
      addedBy: req.salesman._id
    }).select('retailerName shopName contactNo contactNo2 address location createdAt addedBy active assignedSalesman')
      .populate('addedBy', 'name email contactNo active')
      .populate('assignedSalesman', 'name email contactNo active');

    if (!retailer) {
      console.log('[ERROR] Retailer not found or access denied');
      return res.status(404).json({ message: 'Retailer not found or access denied' });
    }

    console.log(`[${retailer.retailerName}, ${retailer.shopName}, [${retailer.location.coordinates}], Added by ID: ${req.salesman.email}]`);

    res.json(retailer);
  } catch (error) {
    console.log('[ERROR]', error.message);
    res.status(500).json({ message: error.message });
  }
};

exports.updateRetailer = async (req, res) => {
  try {
    console.log('\n[UPDATE RETAILER]', req.params.id);

    const updateData = req.body;
    const retailer = await Retailer.findOneAndUpdate(
      { _id: req.params.id},
      updateData,
      { new: true, runValidators: true }
    )
    .populate('addedBy', 'name email contactNo active')
    .populate('assignedSalesman', 'name email contactNo active');

    if (!retailer) {
      console.log('[ERROR] Retailer not found or not authorized to update');
      return res.status(404).json({ message: 'Retailer not found or access denied' });
    }

    console.log(`[${retailer.retailerName}, ${retailer.shopName}, [${retailer.location.coordinates}], Assigned to: ${req.salesman.email}]`);

    res.json(retailer);
  } catch (error) {
    console.log('[ERROR]', error.message);
    res.status(400).json({ message: error.message });
  }
};

exports.deleteRetailer = async (req, res) => {
  try {
    console.log('\n[DELETE RETAILER]', req.params.id);
    const retailer = await Retailer.findByIdAndDelete({ _id: req.params.id, addedBy: req.salesman._id },
    );

    if (!retailer) {
      console.log('[ERROR] Retailer not found for deletion');
      return res.status(404).json({ message: 'Retailer not found' });
    }

    console.log(`[${retailer.retailerName}, ${retailer.shopName}, [${retailer.location.coordinates}] Deleted]`);

    res.json({ message: 'Retailer deleted successfully' });
  } catch (error) {
    console.log('[ERROR]', error.message);
    res.status(500).json({ message: error.message });
  }
};

exports.getRetailersByLocation = async (req, res) => {
  try {
    console.log('\n[GET RETAILERS BY LOCATION]');
    const { latitude, longitude, radius = 10 } = req.query;

    const retailers = await Retailer.find({
      addedBy: req.salesman._id,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: radius * 1000
        }
      }
    }).populate('addedBy', 'name email contactNo verified');

    retailers.forEach(r => {
      console.log(`[${r.retailerName}, ${r.shopName}, [${r.location.coordinates}], Added by: ${r.addedBy ? r.addedBy.email : 'N/A'}]`);
    });

    res.json(retailers);
  } catch (error) {
    console.log('[ERROR]', error.message);
    res.status(500).json({ message: error.message });
  }
};

// Admin Delete Retailer
exports.adminDeleteRetailer = async (req, res) => {
  try {
    const retailerId = req.params.id;
    console.log(`\n[ADMIN DELETE RETAILER] ID: ${retailerId}`);

    // Start a session for transaction
    const session = await Retailer.startSession();
    session.startTransaction();

    try {
      // Delete all sales associated with this retailer
      const deletedSales = await Sale.deleteMany({ retailer: retailerId }, { session });
      console.log(`[ADMIN] Deleted ${deletedSales.deletedCount} sales associated with retailer`);

      // Delete the retailer
      const retailer = await Retailer.findByIdAndDelete(retailerId, { session });

      if (!retailer) {
        await session.abortTransaction();
        console.log('[ERROR] Retailer not found for admin deletion');
        return res.status(404).json({ message: 'Retailer not found' });
      }

      await session.commitTransaction();
      console.log(`[ADMIN] Retailer [${retailer.retailerName}, ${retailer.shopName}] and all associated sales deleted successfully`);
      
      res.json({ 
        message: 'Retailer and all associated sales deleted successfully by admin',
        deletedRetailer: {
          id: retailer._id,
          name: retailer.retailerName,
          shopName: retailer.shopName
        },
        deletedSalesCount: deletedSales.deletedCount
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.log('[ERROR] Admin deleting retailer:', error.message);
    res.status(500).json({ message: error.message });
  }
};

exports.adminGetRetailerById = async (req, res) => {
  try {
    console.log('\n[GET RETAILER BY ID]', req.params.id);

    const retailer = await Retailer.findOne({
      _id: req.params.id
    }).populate('addedBy', 'name email contactNo verified');

    if (!retailer) {
      console.log('[ERROR] Retailer not found or access denied');
      return res.status(404).json({ message: 'Retailer not found or access denied' });
    }

    console.log(`[${retailer.retailerName}, ${retailer.shopName}, [${retailer.location.coordinates}]]`);

    res.json(retailer);
  } catch (error) {
    console.log('[ERROR]', error.message);
    res.status(500).json({ message: error.message });
  }
};

// Toggle retailer active status
exports.toggleRetailerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    if (typeof active !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Active status must be a boolean value'
      });
    }

    const retailer = await Retailer.findByIdAndUpdate(
      id,
      { active },
      { new: true }
    );

    if (!retailer) {
      return res.status(404).json({
        success: false,
        message: 'Retailer not found'
      });
    }

    res.json({
      success: true,
      message: `Retailer ${active ? 'activated' : 'deactivated'} successfully`,
      data: retailer
    });

  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating retailer status',
      error: error.message
    });
  }
};

// Get active retailers
exports.getActiveRetailers = async (req, res) => {
  try {
    const retailers = await Retailer.find({ active: true });
    res.json(retailers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching active retailers', error: error.message });
  }
};

// Get inactive retailers
exports.getInactiveRetailers = async (req, res) => {
  try {
    const retailers = await Retailer.find({ active: false });
    res.json(retailers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching inactive retailers', error: error.message });
  }
};

// Admin Create Retailer
exports.adminCreateRetailer = async (req, res) => {
  try {
    console.log('\n[ADMIN CREATE RETAILER]');

    const { retailerName, shopName, contactNo, contactNo2, address, location, assignedSalesman } = req.body;

    // Check for missing required fields
    if (!retailerName || !shopName || !contactNo || !address || !location || !location.coordinates || !assignedSalesman) {
      console.log('[ERROR] Missing or invalid required fields');
      return res.status(400).json({
        success: false,
        message: 'Missing or invalid required fields',
        required: ['retailerName', 'shopName', 'contactNo', 'address', 'location (with 2 coordinates)', 'assignedSalesman']
      });
    }

    // Create a new retailer object
    const retailer = new Retailer({
      retailerName,
      shopName,
      contactNo,
      contactNo2,
      address,
      location,
      assignedSalesman, // The salesman who will manage this retailer
      addedBy: req.admin._id, // Set addedBy to admin's ID
      active: true
    });

    await retailer.save();

    console.log(`[ADMIN] Created retailer: [${retailer.retailerName}, ${retailer.shopName}, ${retailer.contactNo}, ${retailer.address}, [${retailer.location.coordinates}], Added by Admin: ${req.admin._id}, Assigned to salesman ID: ${assignedSalesman}]`);

    res.status(201).json({
      success: true,
      message: 'Retailer created successfully',
      data: retailer
    });
  } catch (error) {
    console.log('[ERROR]', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

// Admin Update Retailer
exports.adminUpdateRetailer = async (req, res) => {
  try {
    console.log('\n[ADMIN UPDATE RETAILER]', req.params.id);

    const updateData = req.body;
    const retailer = await Retailer.findOneAndUpdate(
      { _id: req.params.id },
      updateData,
      { new: true, runValidators: true }
    )
    .populate('addedBy', 'name email contactNo active')
    .populate('assignedSalesman', 'name email contactNo active');

    if (!retailer) {
      console.log('[ERROR] Retailer not found');
      return res.status(404).json({ message: 'Retailer not found' });
    }

    console.log(`[ADMIN] Updated retailer: [${retailer.retailerName}, ${retailer.shopName}, [${retailer.location.coordinates}]]`);

    res.json(retailer);
  } catch (error) {
    console.log('[ERROR]', error.message);
    res.status(400).json({ message: error.message });
  }
};

// Admin Toggle Retailer Status
exports.toggleRetailerStatus = async (req, res) => {
  try {
    console.log('\n[ADMIN TOGGLE RETAILER STATUS]', req.params.id);

    const retailer = await Retailer.findById(req.params.id);
    if (!retailer) {
      console.log('[ERROR] Retailer not found');
      return res.status(404).json({ message: 'Retailer not found' });
    }

    retailer.active = !retailer.active;
    await retailer.save();

    console.log(`[ADMIN] Toggled retailer status: [${retailer.retailerName}, ${retailer.shopName}, Active: ${retailer.active}]`);

    res.json({
      message: `Retailer ${retailer.active ? 'activated' : 'deactivated'} successfully`,
      retailer
    });
  } catch (error) {
    console.log('[ERROR]', error.message);
    res.status(400).json({ message: error.message });
  }
};

// Get retailers by salesman ID
exports.getRetailersBySalesman = async (req, res) => {
  try {
    console.log('\n[GET RETAILERS BY SALESMAN]');
    const userId = req.salesman._id;
    console.log(`[SALESMAN ID: ${userId}]`);

    const retailers = await Retailer.find({ addedBy: userId })
      .select('retailerName shopName contactNo contactNo2 address location createdAt addedBy active assignedSalesman')
      .populate('addedBy', 'name email contactNo active')
      .populate('assignedSalesman', 'name email contactNo active');

    retailers.forEach(r => {
      console.log(`[${r.retailerName}, ${r.shopName}, [${r.location.coordinates}]]`);
    });

    res.json(retailers);
  } catch (error) {
    console.log('[ERROR]', error.message);
    res.status(500).json({ message: error.message });
  }
};

// Get filtered retailers
exports.getFilteredRetailers = async (req, res) => {
  try {
    const {
      retailerName,
      shopName,
      contactNo,
      assignedSalesman,
      active,
      startDate,
      endDate
    } = req.query;

    // Build filter object
    const filter = {};
    
    // Text search filters
    if (retailerName) {
      filter.retailerName = { $regex: retailerName, $options: 'i' };
    }
    
    if (shopName) {
      filter.shopName = { $regex: shopName, $options: 'i' };
    }
    
    if (contactNo) {
      filter.$or = [
        { contactNo: { $regex: contactNo, $options: 'i' } },
        { contactNo2: { $regex: contactNo, $options: 'i' } }
      ];
    }

    // Assigned salesman filter
    if (assignedSalesman) {
      filter.assignedSalesman = assignedSalesman;
    }

    // Active status filter
    if (active !== undefined) {
      filter.active = active === 'true';
    }
    
    // Date range filter
    if (startDate && endDate && startDate === endDate) {
      const start = new Date(startDate + 'T00:00:00.000Z');
      const end = new Date(startDate + 'T23:59:59.999Z');
      filter.createdAt = { $gte: start, $lte: end };
    } else if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    console.log('Filtering retailers with createdAt:', filter.createdAt);

    // Execute query with filters
    const retailers = await Retailer.find(filter)
      .select('retailerName shopName contactNo contactNo2 address location createdAt addedBy active assignedSalesman')
      .populate('addedBy', 'name email contactNo active')
      .populate('assignedSalesman', 'name email contactNo active')
      .sort({ createdAt: -1 });

    console.log('\n::[GET FILTERED RETAILERS]');
    console.log('Filters applied:', {
      retailerName,
      shopName,
      contactNo,
      assignedSalesman,
      active,
      startDate,
      endDate
    });
    console.log(`Found ${retailers.length} retailers matching the criteria`);

    res.json(retailers);
  } catch (error) {
    console.log('::[ERROR] Get filtered retailers error:', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: error.message });
  }
};

exports.uploadRetailersCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const retailers = [];
    const errors = [];
    let successCount = 0;

    // Create a parser for the CSV file
    const parser = fs.createReadStream(req.file.path)
      .pipe(parse({
        columns: true,
        skip_empty_lines: true,
        trim: true
      }));

    // Process each row in the CSV
    for await (const record of parser) {
      try {
        // Validate required fields
        if (!record.retailerName || !record.shopName || !record.contactNo || !record.address || !record.assignedSalesman) {
          errors.push({
            row: record,
            error: 'Missing required fields'
          });
          continue;
        }

        // Validate contact numbers are numeric
        if (!/^\d+$/.test(record.contactNo) || (record.contactNo2 && !/^\d+$/.test(record.contactNo2))) {
          errors.push({
            row: record,
            error: 'Contact numbers must be numeric'
          });
          continue;
        }

        // Check if contact number already exists
        const existingRetailer = await Retailer.findOne({
          $or: [
            { contactNo: record.contactNo },
            { contactNo2: record.contactNo }
          ]
        });

        if (existingRetailer) {
          // Skip silently without adding to errors
          continue;
        }

        // Verify assignedSalesman exists
        const salesman = await Salesman.findById(record.assignedSalesman);
        if (!salesman) {
          errors.push({
            row: record,
            error: `Invalid assignedSalesman ID: ${record.assignedSalesman}`
          });
          continue;
        }

        // Create retailer object
        const retailer = new Retailer({
          retailerName: record.retailerName,
          shopName: record.shopName,
          contactNo: record.contactNo,
          contactNo2: record.contactNo2 || '',
          address: record.address,
          location: {
            type: 'Point',
            coordinates: [] // Empty array as default coordinates
          },
          assignedSalesman: record.assignedSalesman,
          addedBy: req.admin._id,
          active: true
        });

        await retailer.save();
        successCount++;
        retailers.push(retailer);
      } catch (error) {
        errors.push({
          row: record,
          error: error.message
        });
      }
    }

    // Clean up the uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      message: 'CSV processing completed',
      successCount,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      retailers: retailers
    });

  } catch (error) {
    console.log('[ERROR] CSV Upload:', error.message);
    res.status(500).json({ message: error.message });
  }
};
