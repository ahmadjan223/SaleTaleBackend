const mongoose = require('mongoose');

const retailerSchema = new mongoose.Schema({
  retailerName: {
    type: String,
    required: true,
    trim: true
  },
  shopName: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Retailer', retailerSchema); 