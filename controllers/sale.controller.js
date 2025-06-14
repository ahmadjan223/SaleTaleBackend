const Sale = require('../models/sale.model');
const Retailer = require('../models/retailer.model');
const Product = require('../models/product.model');
const Salesman = require('../models/salesman.model');

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

    const sale = new Sale({ 
      retailer,
      products,
      amount,
      coordinates,
      addedBy: req.salesman._id 
    });

    await sale.save();
    console.log(`[CREATED SALE] Retailer:${req.body.retailer} by ${req.salesman.email} at coordinates: [${coordinates.coordinates}]`);
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
      endDate
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
      endDate
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


