const mongoose = require('mongoose');

// Schema for individual product in a sale
const ProductSaleSchema = new mongoose.Schema({
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const saleSchema = new mongoose.Schema({
//if we use ref that object will be attached instead of objectid.
  retailer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Retailer',
    required: true
  },
  products: {
    type: Map,
    of: ProductSaleSchema,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Salesman', required: true },
  valid: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create a 2dsphere index for geospatial queries
saleSchema.index({ coordinates: '2dsphere' });

module.exports = mongoose.model('Sale', saleSchema);


