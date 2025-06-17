const mongoose = require('mongoose');

const FranchiseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  salesman: {
    type: String,
    required: true,
    trim: true,
    unique: true
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
    index: true,
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

// Add compound index for name and masterSimNo
FranchiseSchema.index({ name: 1, masterSimNo: 1 }, { unique: true });

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

// Add method to check if salesman name is available
FranchiseSchema.statics.isSalesmanAvailable = async function(salesman) {
  const franchise = await this.findOne({ salesman });
  return !franchise;
};

const Franchise = mongoose.model('Franchise', FranchiseSchema);

module.exports = Franchise; 