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
    trim: true,
    unique: true,
    index: true,
    validate: {
      validator: function(v) {
        // Ensure it's a valid number and has reasonable length
        return /^\d{10,15}$/.test(v);
      },
      message: props => `${props.value} is not a valid contact number! Must be 10-15 digits.`
    }
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
  assignedSalesman: { type: mongoose.Schema.Types.ObjectId, ref: 'Salesman', required: true },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add pre-save middleware to ensure contactNo is properly formatted
retailerSchema.pre('save', function(next) {
  if (this.isModified('contactNo')) {
    // Remove any non-digit characters
    this.contactNo = this.contactNo.replace(/\D/g, '');
  }
  next();
});

// Add method to check if contact number is available
retailerSchema.statics.isContactNoAvailable = async function(contactNo) {
  const retailer = await this.findOne({ contactNo });
  return !retailer;
};

module.exports = mongoose.model('Retailer', retailerSchema); 