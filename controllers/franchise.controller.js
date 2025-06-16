const Franchise = require('../models/franchise.model');
const Salesman = require('../models/salesman.model');

// Create a new franchise
exports.createFranchise = async (req, res) => {
  try {
    const { name, address, masterSimNo } = req.body;

    // Check if masterSimNo is already in use
    const isAvailable = await Franchise.isMasterSimNoAvailable(masterSimNo);
    if (!isAvailable) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Master SIM number is already in use'
      });
    }

    const franchise = await Franchise.create({
      name,
      address,
      masterSimNo
    });

    res.status(201).json({
      message: 'Franchise created successfully',
      franchise
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.message
      });
    }
    res.status(500).json({
      error: 'Server Error',
      message: 'Error creating franchise'
    });
  }
};

// Get all franchises
exports.getAllFranchises = async (req, res) => {
  try {
    const franchises = await Franchise.find()
      .sort({ createdAt: -1 });
    
    res.json({
      count: franchises.length,
      franchises
    });
  } catch (error) {
    res.status(500).json({
      error: 'Server Error',
      message: 'Error fetching franchises'
    });
  }
};

// Get franchise by ID
exports.getFranchiseById = async (req, res) => {
  try {
    const franchise = await Franchise.findById(req.params.id);
    
    if (!franchise) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Franchise not found'
      });
    }

    res.json(franchise);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'Invalid ID',
        message: 'Invalid franchise ID format'
      });
    }
    res.status(500).json({
      error: 'Server Error',
      message: 'Error fetching franchise'
    });
  }
};

// Update franchise
exports.updateFranchise = async (req, res) => {
  try {
    const { name, address, masterSimNo, active } = req.body;
    const franchiseId = req.params.id;

    // If masterSimNo is being updated, check if it's available
    if (masterSimNo) {
      const existingFranchise = await Franchise.findOne({ 
        masterSimNo,
        _id: { $ne: franchiseId }
      });
      
      if (existingFranchise) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Master SIM number is already in use by another franchise'
        });
      }
    }

    const franchise = await Franchise.findByIdAndUpdate(
      franchiseId,
      { name, address, masterSimNo, active },
      { new: true, runValidators: true }
    );

    if (!franchise) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Franchise not found'
      });
    }

    res.json({
      message: 'Franchise updated successfully',
      franchise
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.message
      });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'Invalid ID',
        message: 'Invalid franchise ID format'
      });
    }
    res.status(500).json({
      error: 'Server Error',
      message: 'Error updating franchise'
    });
  }
};

// Delete franchise
exports.deleteFranchise = async (req, res) => {
  try {
    const franchise = await Franchise.findByIdAndDelete(req.params.id);

    if (!franchise) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Franchise not found'
      });
    }

    res.json({
      message: 'Franchise deleted successfully',
      franchise
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'Invalid ID',
        message: 'Invalid franchise ID format'
      });
    }
    res.status(500).json({
      error: 'Server Error',
      message: 'Error deleting franchise'
    });
  }
};

// Get all salesmen of a franchise
exports.getFranchiseSalesmen = async (req, res) => {
  try {
    const franchiseId = req.params.id;

    // First check if franchise exists
    const franchise = await Franchise.findById(franchiseId);
    if (!franchise) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Franchise not found'
      });
    }

    // Get all salesmen associated with this franchise
    const salesmen = await Salesman.find({ franchise: franchiseId })
      .select('-password') // Exclude password from response
      .sort({ createdAt: -1 });

    res.json({
      franchise: {
        id: franchise._id,
        name: franchise.name
      },
      count: salesmen.length,
      salesmen
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'Invalid ID',
        message: 'Invalid franchise ID format'
      });
    }
    res.status(500).json({
      error: 'Server Error',
      message: 'Error fetching franchise salesmen'
    });
  }
};

// Toggle franchise status
exports.toggleFranchiseStatus = async (req, res) => {
  try {
    const franchiseId = req.params.id;
    const { active } = req.body;

    const franchise = await Franchise.findByIdAndUpdate(
      franchiseId,
      { active },
      { new: true, runValidators: true }
    );

    if (!franchise) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Franchise not found'
      });
    }

    res.json({
      message: 'Franchise status updated successfully',
      data: franchise
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'Invalid ID',
        message: 'Invalid franchise ID format'
      });
    }
    res.status(500).json({
      error: 'Server Error',
      message: 'Error updating franchise status'
    });
  }
}; 