const Sale = require('../models/sale.model');

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
      .populate('retailer')
      .populate('addedBy', 'name email');

    console.log('\n::[GET SALES] AddedBy:', req.salesman.email);

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
    console.log('::[ERROR] Get sales error:', {
      error: error.message,
      stack: error.stack,
      salesman: req.salesman.email
    });
    res.status(500).json({ message: error.message });
  }
};

exports.getAllSales = async (req, res) => {
  try {
    const sales = await Sale.find({})
      .populate('retailer')
      .populate('addedBy', 'name email');

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
      .populate('addedBy', 'name email');

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

    const sale = await Sale.findByIdAndDelete({ _id: saleId, addedBy: req.salesman._id });

    if (!sale) {
      console.log('::[ERROR] Sale not found for deletion, ID:', saleId);
      return res.status(404).json({ message: 'Sale not found' });
    }

    const productDetails = Object.entries(sale.products)
      .map(([productId, details]) => `${productId}: ${details.quantity} units @ $${details.price} each`)
      .join(', ');

    console.log(`::[DELETED] Sale ID: ${sale._id} @ ${sale.addedBy.email}, Products: ${productDetails}, Total Amount: ${sale.amount}, Created by: ${sale.addedBy}, Created: ${sale.createdAt}, Coordinates: [${sale.coordinates?.coordinates}]`);
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
    ).populate('retailer addedBy');

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

const Salesman = require('../models/salesman.model');


