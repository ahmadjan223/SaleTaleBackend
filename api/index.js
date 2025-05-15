const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Log environment variables (excluding sensitive ones)
console.log('Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not set',
  ip: process.env.ip ? 'Set' : 'Not set'
});

// Import only existing routes
const retailerRoutes = require('../routes/retailer.routes');
const productRoutes = require('../routes/product.routes');
const saleRoutes = require('../routes/sale.routes');
const salesmanRoutes = require('../routes/salesman.routes');

const app = express();

// Apply core middleware BEFORE route definitions
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true // If you need to send cookies or authorization headers
}));
app.use(express.json()); // To parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded request bodies

// Logging middleware - can be here or after core middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Use only existing routes
app.use('/api/retailers', retailerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/salesmen', salesmanRoutes);

// Error handling middleware - should be after routes
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Basic error handler for uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Salesman App Backend (Vercel) 14 May 2025 with cors updated.',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      salesman: '/api/salesman',
      retailers: '/api/retailers',
      products: '/api/products',
      sales: '/api/sales'
    }
  });
});

// Wrap MongoDB connection in a try-catch
try {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
    .then(() => console.log('Connected to MongoDB (Vercel).'))
    .catch((err) => {
      console.error('MongoDB connection error:', err);
      process.exit(1);
    });
} catch (error) {
  console.error('Error during MongoDB connection setup:', error);
  process.exit(1);
}

module.exports = app;
