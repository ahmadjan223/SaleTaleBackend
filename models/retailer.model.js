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
  contactNo: {
    type: String,
    required: true,
    trim: true
  },
  contactNo2: {
    type: String,
    trim: true
  },
  address: {
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
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Salesman', required: true },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Retailer', retailerSchema); 