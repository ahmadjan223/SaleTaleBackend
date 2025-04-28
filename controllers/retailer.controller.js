const Retailer = require('../models/retailer.model');

exports.createRetailer = async (req, res) => {
  try {
    console.log('\n[CREATE RETAILER]');
    if (!req.body.retailerName || !req.body.shopName || !req.body.location) {
      console.log('[ERROR] Missing required fields');
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['retailerName', 'shopName', 'location (with latitude and longitude)']
      });
    }

    const retailer = new Retailer(req.body);
    await retailer.save();

    console.log(`[${retailer.retailerName}, ${retailer.shopName}, [${retailer.location.coordinates}], ${retailer.createdAt}]`);

    res.status(201).json(retailer);
  } catch (error) {
    console.log('[ERROR]', error.message);
    res.status(400).json({ message: error.message });
  }
};

exports.getRetailers = async (req, res) => {
  try {
    console.log('\n[GET ALL RETAILERS]');
    const retailers = await Retailer.find();
    retailers.forEach(r => {
      console.log(`[${r.retailerName}, ${r.shopName}, [${r.location.coordinates}], ${r.createdAt}]`);
    });
    res.json(retailers);
  } catch (error) {
    console.log('[ERROR]', error.message);
    res.status(500).json({ message: error.message });
  }
};

exports.getRetailerById = async (req, res) => {
  try {
    console.log('\n[GET RETAILER BY ID]', req.params.id);
    const retailer = await Retailer.findById(req.params.id);
    if (!retailer) {
      console.log('[ERROR] Retailer not found');
      return res.status(404).json({ message: 'Retailer not found' });
    }

    console.log(`[${retailer.retailerName}, ${retailer.shopName}, [${retailer.location.coordinates}], ${retailer.createdAt}]`);

    res.json(retailer);
  } catch (error) {
    console.log('[ERROR]', error.message);
    res.status(500).json({ message: error.message });
  }
};

exports.updateRetailer = async (req, res) => {
  try {
    console.log('\n[UPDATE RETAILER]', req.params.id);
    const retailer = await Retailer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!retailer) {
      console.log('[ERROR] Retailer not found for update');
      return res.status(404).json({ message: 'Retailer not found' });
    }

    console.log(`[${retailer.retailerName}, ${retailer.shopName}, [${retailer.location.coordinates}], ${retailer.createdAt}]`);

    res.json(retailer);
  } catch (error) {
    console.log('[ERROR]', error.message);
    res.status(400).json({ message: error.message });
  }
};

exports.deleteRetailer = async (req, res) => {
  try {
    console.log('\n[DELETE RETAILER]', req.params.id);
    const retailer = await Retailer.findByIdAndDelete(req.params.id);

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
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: radius * 1000
        }
      }
    });

    retailers.forEach(r => {
      console.log(`[${r.retailerName}, ${r.shopName}, [${r.location.coordinates}], ${r.createdAt}]`);
    });

    res.json(retailers);
  } catch (error) {
    console.log('[ERROR]', error.message);
    res.status(500).json({ message: error.message });
  }
};
