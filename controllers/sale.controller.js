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