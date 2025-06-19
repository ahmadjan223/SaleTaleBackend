const Sale = require('../models/sale.model');
const Retailer = require('../models/retailer.model');
const Product = require('../models/product.model');
const Salesman = require('../models/salesman.model');
const { MAX_SALE_DISTANCE, COORDINATE_DECIMAL_PLACES } = require('../config/constants');
const fs = require('fs');
const { parse } = require('csv-parse');
const Franchise = require('../models/franchise.model');

// Function to calculate distance between two coordinates in meters
const calculateDistance = (coord1, coord2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = coord1[1] * Math.PI / 180; // latitude 1 in radians
  const φ2 = coord2[1] * Math.PI / 180; // latitude 2 in radians
  const Δφ = (coord2[1] - coord1[1]) * Math.PI / 180; // difference in latitude
  const Δλ = (coord2[0] - coord1[0]) * Math.PI / 180; // difference in longitude

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in meters
};

exports.createSale = async (req, res) => {
  try {
    const { retailer, products, amount, coordinates } = req.body;

    // Validate coordinates
    if (!coordinates || !coordinates.coordinates || !Array.isArray(coordinates.coordinates) || coordinates.coordinates.length !== 2) {
      return res.status(400).json({ 
        message: 'Invalid coordinates format. Expected format: { type: "Point", coordinates: [longitude, latitude] }' 
      });
    }

    // Validate products
    if (!products || !(products instanceof Map) && typeof products !== 'object') {
      return res.status(400).json({ 
        message: 'Invalid products format. Products must be a map of product IDs to their details' 
      });
    }

    // Get retailer coordinates for distance validation
    let isValid = false;
    let distance = null;
    
    try {
      const retailerDoc = await Retailer.findById(retailer);
      if (retailerDoc && retailerDoc.location && retailerDoc.location.coordinates) {
        const retailerCoords = retailerDoc.location.coordinates;
        const saleCoords = coordinates.coordinates;
        
        // Calculate distance between retailer and sale location
        distance = calculateDistance(retailerCoords, saleCoords);
        
        // Set valid to true if distance is less than MAX_SALE_DISTANCE
        isValid = distance <= MAX_SALE_DISTANCE;
        
        console.log(`[DISTANCE CALCULATION] Retailer: ${retailerDoc.retailerName || retailerDoc.shopName}`);
        console.log(`[DISTANCE CALCULATION] Retailer coordinates: [${retailerCoords.map(coord => coord.toFixed(COORDINATE_DECIMAL_PLACES))}]`);
        console.log(`[DISTANCE CALCULATION] Sale coordinates: [${saleCoords.map(coord => coord.toFixed(COORDINATE_DECIMAL_PLACES))}]`);
        console.log(`[DISTANCE CALCULATION] Distance: ${distance.toFixed(COORDINATE_DECIMAL_PLACES)} meters`);
        console.log(`[DISTANCE CALCULATION] Valid: ${isValid} (${distance <= MAX_SALE_DISTANCE ? `Within ${MAX_SALE_DISTANCE}m` : `Beyond ${MAX_SALE_DISTANCE}m`})`);
      } else {
        console.log(`[DISTANCE CALCULATION] Retailer ${retailer} has no coordinates, setting valid to false`);
        isValid = false;
      }
    } catch (error) {
      console.log(`[DISTANCE CALCULATION] Error calculating distance: ${error.message}`);
      isValid = false;
    }

    const sale = new Sale({ 
      retailer,
      products,
      amount,
      coordinates,
      addedBy: req.salesman._id,
      valid: isValid
    });

    await sale.save();
    console.log(`[CREATED SALE] Retailer:${req.body.retailer} by ${req.salesman.email} at coordinates: [${coordinates.coordinates.map(coord => coord.toFixed(COORDINATE_DECIMAL_PLACES))}]`);
    console.log(`[CREATED SALE] Distance: ${distance ? distance.toFixed(COORDINATE_DECIMAL_PLACES) + 'm' : 'N/A'}, Valid: ${isValid}`);
    res.status(201).json(sale);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getSales = async (req, res) => {
  try {
    const sales = await Sale.find({ addedBy: req.salesman._id })
      .select('retailer products amount coordinates addedBy valid createdAt')
      .populate('retailer')
      .populate('addedBy', '_id name email contactNo contactNo2 active')
      .sort({ createdAt: -1 });

    console.log(`\n::[GET SALES] Found ${sales.length} sales for salesman: ${req.salesman.email}`);
    sales.forEach(sale => {
      const productDetails = Object.entries(sale.products)
        .map(([productId, details]) => `${productId}: ${details.quantity} units @ $${details.price} each`)
        .join(', ');
      
      console.log(`[SALE] Products: ${productDetails}, Total Amount: ${sale.amount}, Coordinates: [${sale.coordinates?.coordinates}]`);
    });

    res.json(sales);
  } catch (error) {
    console.log('::[ERROR] Get sales error:', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: error.message });
  }
};

exports.getAllSales = async (req, res) => {
  try {
    const sales = await Sale.find({})
      .select('retailer products amount coordinates addedBy valid createdAt')
      .populate('retailer')
      .populate('addedBy', 'name email contactNo contactNo2 active')
      .sort({ createdAt: -1 });

    console.log('\n::[GET ALL SALES]');

    sales.forEach(sale => {
      // Validate required fields
      if (!sale.retailer || !sale.products || !sale.amount || !sale.coordinates) {
        console.log(`[WARNING] Sale ${sale._id} is missing required fields`);
        return;
      }

      // Log sale details
      const productDetails = Object.entries(sale.products)
        .map(([productId, details]) => {
          // Validate product details
          if (!details.quantity || !details.price || !details.total) {
            console.log(`[WARNING] Product ${productId} in sale ${sale._id} is missing required fields`);
            return `${productId}: Invalid data`;
          }
          return `${productId}: ${details.quantity} units @ $${details.price} each (Total: $${details.total})`;
        })
        .join(', ');

      console.log(`[SALE] ID: ${sale._id}, Retailer: ${sale.retailer?.shopName || sale.retailer}, Products: ${productDetails}, Total Amount: $${sale.amount}, Coordinates: [${sale.coordinates.coordinates}]`);
    });

    res.json(sales);
  } catch (error) {
    console.log('::[ERROR] Get all sales error:', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: error.message });
  }
};

exports.getRetailerSales = async (req, res) => {
  try {
    const sales = await Sale.find({ retailer: req.params.retailerId, addedBy: req.salesman._id })
      .select('retailer products amount coordinates addedBy valid createdAt')
      .populate('addedBy', '_id name email contactNo contactNo2 active')
      .sort({ createdAt: -1 });

    console.log(`[RETAILER SALES] Retailer ID: ${req.params.retailerId}`);
    sales.forEach(sale => {
      const productDetails = Object.entries(sale.products)
        .map(([productId, details]) => `${productId}: ${details.quantity} units @ $${details.price} each`)
        .join(', ');
      
      console.log(`[SALE] Products: ${productDetails}, Total Amount: ${sale.amount}, Coordinates: [${sale.coordinates?.coordinates}]`);
    });

    res.json(sales);
  } catch (error) {
    console.log('::[ERROR] Get retailer sales error:', {
      error: error.message,
      stack: error.stack,
      retailerId: req.params.retailerId
    });
    res.status(500).json({ message: error.message });
  }
};

exports.deleteSale = async (req, res) => {
  try {
    const saleId = req.params.id;
    console.log('\n::[DELETE SALE] Attempting to delete sale with ID:', saleId);

    if (!saleId) {
      console.log('::[ERROR] No sale ID provided');
      return res.status(400).json({ message: 'Sale ID is required' });
    }

    // First find the sale with populated fields
    const sale = await Sale.findOne({ _id: saleId, addedBy: req.salesman._id })
      .populate('addedBy', 'name email')
      .populate('retailer', 'retailerName shopName');

    if (!sale) {
      console.log('::[ERROR] Sale not found for deletion, ID:', saleId);
      return res.status(404).json({ message: 'Sale not found' });
    }

    // Store sale details for logging before deletion
    const saleDetails = {
      id: sale._id,
      email: sale.addedBy?.email,
      products: sale.products,
      amount: sale.amount,
      createdBy: sale.addedBy?._id,
      createdAt: sale.createdAt,
      coordinates: sale.coordinates?.coordinates
    };

    // Now delete the sale
    await Sale.findByIdAndDelete(saleId);

    const productDetails = Object.entries(saleDetails.products)
      .map(([productName, details]) => `${productName}: ${details.quantity} units @ ${details.price} each`)
      .join(', ');

    console.log(`::[DELETED] Sale ID: ${saleDetails.id} @ ${saleDetails.email}, Products: ${productDetails}, Total Amount: ${saleDetails.amount}, Created by: ${saleDetails.createdBy}, Created: ${saleDetails.createdAt}, Coordinates: [${saleDetails.coordinates}]`);
    res.json({ message: 'Sale deleted successfully' });
  } catch (error) {
    console.log('::[ERROR] Delete sale error:', {
      error: error.message,
      stack: error.stack,
      id: req.params.id
    });
    res.status(400).json({ message: error.message });
  }
};

exports.updateSale = async (req, res) => {
  try {
    console.log('\n::[UPDATE SALE]', req.params.id);
    
    // Validate coordinates if provided
    if (req.body.coordinates) {
      if (!req.body.coordinates.coordinates || !Array.isArray(req.body.coordinates.coordinates) || req.body.coordinates.coordinates.length !== 2) {
        return res.status(400).json({ 
          message: 'Invalid coordinates format. Expected format: { type: "Point", coordinates: [longitude, latitude] }' 
        });
      }
    }

    // Validate products if provided
    if (req.body.products) {
      if (typeof req.body.products !== 'object') {
        return res.status(400).json({ 
          message: 'Invalid products format. Products must be an object mapping product IDs to their details' 
        });
      }
    }

    const sale = await Sale.findByIdAndUpdate(
      { _id: req.params.id, addedBy: req.salesman._id },
      req.body,
      { new: true, runValidators: true }
    ).populate('retailer')
     .populate('addedBy', '_id name email contactNo contactNo2 verified');

    if (!sale) {
      console.log('::[ERROR] Sale not found for update');
      return res.status(404).json({ message: 'Sale not found' });
    }

    const productDetails = Object.entries(sale.products)
      .map(([productId, details]) => `${productId}: ${details.quantity} units @ $${details.price} each`)
      .join(', ');

    console.log(`::[UPDATED] Sale ID: ${sale._id}, Products: ${productDetails}, Total Amount: ${sale.amount}, Created by: ${sale.addedBy.name}, Created: ${sale.createdAt}, Coordinates: [${sale.coordinates?.coordinates}]`);
    res.json(sale);
  } catch (error) {
    console.log('::[ERROR] Update sale error:', {
      error: error.message,
      stack: error.stack,
      id: req.params.id
    });
    res.status(400).json({ message: error.message });
  }
};

// Admin Delete Sale
exports.adminDeleteSale = async (req, res) => {
  try {
    const saleId = req.params.id;
    console.log(`\n[ADMIN DELETE SALE] ID: ${saleId}`);

    const sale = await Sale.findByIdAndDelete(saleId);

    if (!sale) {
      console.log('[ERROR] Sale not found for admin deletion');
      return res.status(404).json({ message: 'Sale not found' });
    }

    const productDetails = Object.entries(sale.products)
      .map(([productId, details]) => `${productId}: ${details.quantity} units @ $${details.price} each`)
      .join(', ');

    console.log(`[ADMIN] Sale [ID: ${sale._id}] deleted successfully. Products: ${productDetails}, Total Amount: ${sale.amount}`);
    res.json({ message: 'Sale deleted successfully by admin' });
  } catch (error) {
    console.log('[ERROR] Admin deleting sale:', {
      error: error.message,
      stack: error.stack,
      id: req.params.id
    });
    res.status(500).json({ message: error.message });
  }
};

exports.getFilteredSales = async (req, res) => {
  try {
    const {
      salesman,
      product,
      retailer,
      startDate,
      endDate,
      valid
    } = req.query;

    // Build filter object
    const filter = {};
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Filter by IDs
    if (retailer) filter.retailer = retailer;
    if (salesman) filter.addedBy = salesman;
    
    // Filter by product name
    if (product) {
      // Find all sales where the product name exists as a key in the products map
      filter[`products.${product}`] = { $exists: true };
    }

    // Filter by valid status
    if (valid !== undefined) {
      filter.valid = valid === 'true';
    }

    // Execute query with filters
    const sales = await Sale.find(filter)
      .populate('retailer')
      .populate('addedBy', '_id name email contactNo contactNo2 verified')
      .sort({ createdAt: -1 });

    console.log('\n::[GET FILTERED SALES]');
    console.log('Filters applied:', {
      salesman,
      product,
      retailer,
      startDate,
      endDate,
      valid
    });
    console.log(`Found ${sales.length} sales matching the criteria`);

    res.json(sales);
  } catch (error) {
    console.log('::[ERROR] Get filtered sales error:', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: error.message });
  }
};

exports.getSale = async (req, res) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, addedBy: req.salesman._id })
      .select('retailer products amount coordinates addedBy valid createdAt')
      .populate('retailer')
      .populate('addedBy', '_id name email contactNo contactNo2 active');

    if (!sale) {
      console.log('::[ERROR] Sale not found');
      return res.status(404).json({ message: 'Sale not found' });
    }

    const productDetails = Object.entries(sale.products)
      .map(([productId, details]) => `${productId}: ${details.quantity} units @ $${details.price} each`)
      .join(', ');

    console.log(`\n::[GET SALE] ID: ${sale._id}`);
    console.log(`Products: ${productDetails}, Total Amount: ${sale.amount}, Coordinates: [${sale.coordinates?.coordinates}]`);

    res.json(sale);
  } catch (error) {
    console.log('::[ERROR] Get sale error:', {
      error: error.message,
      stack: error.stack,
      id: req.params.id
    });
    res.status(500).json({ message: error.message });
  }
};

// Toggle sale validity
exports.toggleSaleValidity = async (req, res) => {
  try {
    const { id } = req.params;
    const { valid } = req.body;

    if (typeof valid !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Valid status must be a boolean value'
      });
    }

    const sale = await Sale.findByIdAndUpdate(
      id,
      { valid },
      { new: true }
    );

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.json({
      success: true,
      message: `Sale ${valid ? 'validated' : 'invalidated'} successfully`,
      data: sale
    });

  } catch (error) {
    console.error('Toggle validity error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating sale validity',
      error: error.message
    });
  }
};

// Get valid sales
exports.getValidSales = async (req, res) => {
  try {
    const sales = await Sale.find({ valid: true })
      .populate('retailer')
      .populate('addedBy', '_id name email contactNo contactNo2 active')
      .sort({ createdAt: -1 });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching valid sales', error: error.message });
  }
};

// Get invalid sales
exports.getInvalidSales = async (req, res) => {
  try {
    const sales = await Sale.find({ valid: false })
      .populate('retailer')
      .populate('addedBy', '_id name email contactNo contactNo2 active')
      .sort({ createdAt: -1 });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching invalid sales', error: error.message });
  }
};

exports.adminCreateSale = async (req, res) => {
    try {
        const { retailer, products, amount, coordinates, addedBy, valid, createdAt } = req.body;

        // Create new sale with admin provided data
        const sale = new Sale({
            retailer,
            products,
            amount,
            coordinates,
            addedBy,
            valid: valid !== undefined ? valid : true,
            createdAt: createdAt || new Date()
        });

        // Save the sale
        await sale.save();

        res.status(201).json({
            success: true,
            message: 'Sale created successfully by admin',
            data: sale
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error creating sale',
            error: error.message
        });
    }
};

// Admin upload sales via CSV
exports.adminUploadSalesCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const sales = [];
    const errors = [];
    let successCount = 0;

    // Create a parser for the CSV file
    const parser = fs.createReadStream(req.file.path)
      .pipe(parse({
        columns: true,
        skip_empty_lines: true,
        trim: true
      }));

    for await (const record of parser) {
      try {
        // Validate required fields
        if (!record.retailer || !record.products || !record.amount || !record.coordinates || !record.addedBy) {
          errors.push({ row: record, error: 'Missing required fields' });
          continue;
        }

        // Parse products JSON if needed
        let productsObj = record.products;
        if (typeof productsObj === 'string') {
          try {
            productsObj = JSON.parse(productsObj);
          } catch (e) {
            errors.push({ row: record, error: 'Invalid products JSON' });
            continue;
          }
        }

        // Parse coordinates JSON if needed
        let coordinatesObj = record.coordinates;
        if (typeof coordinatesObj === 'string') {
          try {
            coordinatesObj = JSON.parse(coordinatesObj);
          } catch (e) {
            errors.push({ row: record, error: 'Invalid coordinates JSON' });
            continue;
          }
        }

        // Build sale object
        const sale = new Sale({
          retailer: record.retailer,
          products: productsObj,
          amount: record.amount,
          coordinates: coordinatesObj,
          addedBy: record.addedBy,
          valid: record.valid !== undefined ? record.valid === 'true' || record.valid === true : true,
          createdAt: record.createdAt ? new Date(record.createdAt) : new Date()
        });

        await sale.save();
        successCount++;
        sales.push(sale);
      } catch (error) {
        errors.push({ row: record, error: error.message });
      }
    }

    // Clean up the uploaded file
    try {
      fs.unlinkSync(req.file.path);
    } catch (error) {
      // Ignore file deletion errors
    }

    res.json({
      message: 'CSV processing completed',
      successCount,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      sales: sales
    });
  } catch (error) {
    // Clean up the uploaded file if it exists
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (cleanupError) {}
    }
    res.status(500).json({ message: 'Error processing CSV file', error: error.message });
  }
};

// Get sales statistics with franchise and product filters
exports.getSalesStatistics = async (req, res) => {
  try {
    const { franchise, product, startDate, endDate } = req.query;
    const Sale = require('../models/sale.model');
    const Retailer = require('../models/retailer.model');
    const Salesman = require('../models/salesman.model');
    const Franchise = require('../models/franchise.model');

    let franchiseIds = [];
    if (franchise) {
      // Support both id and name
      const franchiseQuery = /^[0-9a-fA-F]{24}$/.test(franchise)
        ? { _id: franchise }
        : { name: { $regex: new RegExp(franchise, 'i') } };
      const franchises = await Franchise.find(franchiseQuery).select('_id');
      franchiseIds = franchises.map(f => f._id);
      if (!franchiseIds.length) {
        return res.json({ totalAmount: 0, productStats: {}, franchiseStats: {} });
      }
    }

    // Find salesmen for the franchise(s)
    let salesmanIds = [];
    if (franchiseIds.length) {
      const salesmen = await Salesman.find({ franchise: { $in: franchiseIds } }).select('_id');
      salesmanIds = salesmen.map(s => s._id);
      if (!salesmanIds.length) {
        return res.json({ totalAmount: 0, productStats: {}, franchiseStats: {} });
      }
    }

    // Build sale filter
    const saleFilter = {};
    if (salesmanIds.length) saleFilter.addedBy = { $in: salesmanIds };
    if (startDate || endDate) {
      saleFilter.createdAt = {};
      if (startDate) saleFilter.createdAt.$gte = new Date(startDate);
      if (endDate) saleFilter.createdAt.$lte = new Date(endDate);
    }
    if (product) {
      saleFilter[`products.${product}`] = { $exists: true };
    }

    // Query sales with retailer and salesman populated
    const sales = await Sale.find(saleFilter)
      .populate({
        path: 'retailer',
        select: 'retailerName shopName assignedSalesman',
      })
      .populate({
        path: 'addedBy',
        select: 'name franchise',
        populate: { path: 'franchise', select: 'name' }
      })
      .sort({ createdAt: -1 });

    // Product-wise stats
    const productStats = {};
    sales.forEach(sale => {
      let productsObj = sale.products;
      let entries = [];
      if (productsObj instanceof Map) {
        entries = Array.from(productsObj.entries());
      } else if (typeof productsObj === 'object' && productsObj !== null) {
        entries = Object.entries(productsObj);
      }
      entries.forEach(([prod, details]) => {
        if (!productStats[prod]) productStats[prod] = 0;
        productStats[prod] += details.total;
      });
    });

    // Franchise-wise stats
    const franchiseStats = {};
    sales.forEach(sale => {
      const franchiseName = sale.addedBy?.franchise?.name || 'Unknown';
      if (!franchiseStats[franchiseName]) franchiseStats[franchiseName] = 0;
      franchiseStats[franchiseName] += sale.amount;
    });

    // Total amount
    const totalAmount = sales.reduce((sum, sale) => sum + (sale.amount || 0), 0);

    res.json({
      totalAmount,
      productStats,
      franchiseStats
    });
  } catch (error) {
    console.error('::[ERROR] Get sales statistics:', error);
    res.status(500).json({ message: error.message });
  }
};


