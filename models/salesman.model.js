const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SalesmanSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  name: {
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
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        return /^\d{10,15}$/.test(v);
      },
      message: props => `${props.value} is not a valid contact number! Must be 10-15 digits.`
    }
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: props => `${props.value} is not a valid email address!`
    }
  },
  password: {
    type: String,
    required: function() { return this.isNew; },
    minlength: 6
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    default: null
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash password before saving
SalesmanSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Format contact numbers before saving
SalesmanSchema.pre('save', function(next) {
  if (this.isModified('contactNo')) {
    this.contactNo = this.contactNo.replace(/\D/g, '');
  }
  if (this.isModified('contactNo2') && this.contactNo2) {
    this.contactNo2 = this.contactNo2.replace(/\D/g, '');
  }
  next();
});

// Method to compare password
SalesmanSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Static methods to check availability
SalesmanSchema.statics.isEmailAvailable = async function(email) {
  const salesman = await this.findOne({ email: email.toLowerCase() });
  return !salesman;
};

SalesmanSchema.statics.isContactNoAvailable = async function(contactNo) {
  const salesman = await this.findOne({ contactNo });
  return !salesman;
};

const Salesman = mongoose.model('Salesman', SalesmanSchema);

module.exports = Salesman; 