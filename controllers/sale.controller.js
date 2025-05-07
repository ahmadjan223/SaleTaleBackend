const Sale = require('../models/sale.model');

exports.createSale = async (req, res) => {
  try {

    const sale = new Sale({ ...req.body, addedBy: req.salesman._id });

    await sale.save();
    console.log(`[CREATED SALE] Retailer:${req.body.retailer} by ${req.salesman.email}`)
    res.status(201).json(sale);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getSales = async (req, res) => {
  try {
    const sales = await Sale.find({ addedBy: req.salesman._id })
      .populate('retailer')
      .populate('product')
      .populate('addedBy', 'name email');

    console.log('\n::[GET SALES] AddedBy:', req.salesman.email);
    console.log('\n::[GET SALES] AddedBy:', req.salesman.email);

    sales.forEach(sale => {
      console.log(`[SALE] Retailer: ${sale.retailer?.shopName || sale.retailer}, Product: ${sale.product?.name || sale.product}, Quantity: ${sale.quantity}, Amount: ${sale.amount}`);
    });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRetailerSales = async (req, res) => {
  try {
    const sales = await Sale.find({ retailer: req.params.retailerId, addedBy: req.salesman._id })
      .populate('product')
      .populate('addedBy', 'name email');
    console.log(`[RETAILER SALES] Retailer ID: ${req.params.retailerId}, Product: ${sales.map(s => s.product?.name).join(', ')}, Quantity: ${sales.map(s => s.quantity).join(', ')}, Amount: ${sales.map(s => s.amount).join(', ')}`);

    res.json(sales);
  } catch (error) {
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

    console.log(`::[DELETED] Sale ID: ${sale._id} @ ${sale.addedBy.email}, Amount: ${sale.amount}, Created by: ${sale.addedBy}, Created: ${sale.createdAt}`);
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
    const sale = await Sale.findByIdAndUpdate(
      { _id: req.params.id, addedBy: req.salesman._id },
      req.body,
      { new: true, runValidators: true }
    ).populate('retailer product addedBy');

    if (!sale) {
      console.log('::[ERROR] Sale not found for update');
      return res.status(404).json({ message: 'Sale not found' });
    }

    console.log(`::[UPDATED] Sale ID: ${sale._id}, Amount: ${sale.amount}, Quantity: ${sale.quantity}, Created by: ${sale.addedBy.name}, Created: ${sale.createdAt}`);
    res.json(sale);
  } catch (error) {
    console.log('::[ERROR]', error.message);
    res.status(400).json({ message: error.message });
  }
};

const Salesman = require('../models/salesman.model');


