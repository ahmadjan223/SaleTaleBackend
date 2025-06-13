const Retailer = require('../models/retailer.model');

exports.getRetailers = async (req, res) => {
  try {
    const userId = req.salesman._id;
    console.log(`\n[GET RETAILERS] AddedBy: ${userId}`);

    const retailers = await Retailer.find({ addedBy: userId })
      .select('retailerName shopName contactNo contactNo2 address location createdAt addedBy')
      .populate('addedBy', 'name email contactNo verified');

    retailers.forEach(r => {
      console.log(`[${r.retailerName}, ${r.shopName}, ${r.contactNo}, ${r.contactNo2}, ${r.address}, [${r.location.coordinates}], Added by: ${req.salesman.email}]`);
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
      .populate('addedBy', 'name email contactNo verified');

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
    const { retailerName, shopName, contactNo, contactNo2, address, location } = req.body;

    // Check for missing required fields
    if (!retailerName || !shopName || !contactNo || !address || !location || !location.coordinates) {
      console.log('[ERROR] Missing required fields');
      return res.status(400).json({
        message: 'Missing required fields',
        required: ['retailerName', 'shopName', 'contactNo', 'address', 'location (with coordinates: [longitude, latitude])']
      });
    }

    // Create a new retailer object and assign the addedBy field with the salesman ID
    const retailer = new Retailer({
      ...req.body,
      addedBy: req.salesman._id // Use req.salesman (the salesman object set in the auth middleware)
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
    }).populate('addedBy', 'name email contactNo verified');

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
      { _id: req.params.id, addedBy: req.salesman._id},
      updateData,
      { new: true, runValidators: true }
    ).populate('addedBy', 'name email contactNo verified');

    if (!retailer) {
      console.log('[ERROR] Retailer not found or not authorized to update');
      return res.status(404).json({ message: 'Retailer not found or access denied' });
    }

    console.log(`[${retailer.retailerName}, ${retailer.shopName}, [${retailer.location.coordinates}], Added by: ${req.salesman.email}]`);

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

    const retailer = await Retailer.findByIdAndDelete(retailerId);

    if (!retailer) {
      console.log('[ERROR] Retailer not found for admin deletion');
      return res.status(404).json({ message: 'Retailer not found' });
    }

    console.log(`[ADMIN] Retailer [${retailer.retailerName}, ${retailer.shopName}] deleted successfully`);
    res.json({ message: 'Retailer deleted successfully by admin' });
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
