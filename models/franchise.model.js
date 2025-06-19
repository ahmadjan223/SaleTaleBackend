const mongoose = require('mongoose');

const FranchiseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  masterSimNo: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    validate: {
      validator: function(v) {
        // Ensure it's a valid number and has reasonable length
        return /^\d{10,15}$/.test(v);
      },
      message: props => `${props.value} is not a valid SIM number! Must be 10-15 digits.`
    }
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Add pre-save middleware to ensure masterSimNo is properly formatted
FranchiseSchema.pre('save', function(next) {
  if (this.isModified('masterSimNo')) {
    // Remove any non-digit characters
    this.masterSimNo = this.masterSimNo.replace(/\D/g, '');
  }
  next();
});

// Add method to check if masterSimNo is available
FranchiseSchema.statics.isMasterSimNoAvailable = async function(masterSimNo) {
  const franchise = await this.findOne({ masterSimNo });
  return !franchise;
};

const Franchise = mongoose.model('Franchise', FranchiseSchema);

module.exports = Franchise; 
