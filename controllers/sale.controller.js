const Sale = require('../models/sale.model');

exports.createSale = async (req, res) => {
  try {
    const sale = new Sale(req.body);
    await sale.save();
    await sale.populate('retailer product');
    res.status(201).json(sale);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getSales = async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate('retailer')
      .populate('product');
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRetailerSales = async (req, res) => {
  try {
    const sales = await Sale.find({ retailer: req.params.retailerId })
      .populate('product');
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

    const sale = await Sale.findByIdAndDelete(saleId);

    if (!sale) {
      console.log('::[ERROR] Sale not found for deletion, ID:', saleId);
      return res.status(404).json({ message: 'Sale not found' });
    }

    console.log(`::[DELETED] Sale ID: ${sale._id}, Amount: ${sale.amount}, Created: ${sale.createdAt}`);
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
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('retailer product');

    if (!sale) {
      console.log('::[ERROR] Sale not found for update');
      return res.status(404).json({ message: 'Sale not found' });
    }

    console.log(`::[UPDATED] Sale ID: ${sale._id}, Amount: ${sale.amount}, Quantity: ${sale.quantity}, Created: ${sale.createdAt}`);
    res.json(sale);
  } catch (error) {
    console.log('::[ERROR]', error.message);
    res.status(400).json({ message: error.message });
  }
}; 

