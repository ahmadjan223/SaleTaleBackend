const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SalesmanSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  givenName: {
    type: String,
    required: true,
    trim: true
  },
  familyName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  photo: {
    type: String
  },
  password: {
    type: String,
    minlength: 6
  },
  verified: {
    type: Boolean,
    default: false
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

// Method to compare password
SalesmanSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const Salesman = mongoose.model('Salesman', SalesmanSchema);

module.exports = Salesman; 