const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

console.log('\n>>> API server started v0.0.1');

// Log environment variables (excluding sensitive ones)
console.log('Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not set',
  PORT: process.env.PORT || 5000
});

// Import routes
const retailerRoutes = require('../routes/retailer.routes');
const productRoutes = require('../routes/product.routes');
const saleRoutes = require('../routes/sale.routes');
const salesmanRoutes = require('../routes/salesman.routes');
const adminRoutes = require('../routes/adminRoutes');
const franchiseRoutes = require('../routes/franchise.routes');
const statisticsRoutes = require('../routes/statistics.routes');

const app = express();

// Apply core middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Replace the existing request logging middleware with this concise version
app.use((req, res, next) => {
  // Store the original res.json method
  const originalJson = res.json;
  
  // Override res.json method
  res.json = function(data) {
    // Log the request and response
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path} -> ${res.statusCode}`);
    if (res.statusCode >= 400) {
      console.log('Error:', data.error || data.message || 'Unknown error');
    }
    // Call the original res.json method
    return originalJson.call(this, data);
  };
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add this after the middleware setup and before routes
// Global error handler for async routes
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    console.error('API Error:', {
      path: req.path,
      method: req.method,
      error: error.message,
      stack: error.stack
    });
    next(error);
  });
};

// Wrap all route handlers with error handling
const wrapRoutes = (router) => {
  const originalUse = router.use;
  router.use = function(...args) {
    if (args.length === 1 && typeof args[0] === 'function') {
      return originalUse.call(this, asyncHandler(args[0]));
    }
    return originalUse.apply(this, args);
  };
  return router;
};

// Apply error handling wrapper to all routes
wrapRoutes(retailerRoutes);
wrapRoutes(productRoutes);
wrapRoutes(saleRoutes);
wrapRoutes(salesmanRoutes);
wrapRoutes(adminRoutes);
wrapRoutes(franchiseRoutes);
wrapRoutes(statisticsRoutes);

// Routes
app.use('/api/retailers', retailerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/salesmen', salesmanRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/franchises', franchiseRoutes);
app.use('/api/sales', statisticsRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Salesman App Backend',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      salesman: '/api/salesmen',
      retailers: '/api/retailers',
      products: '/api/products',
      sales: '/api/sales',
      admin: '/api/admin'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: dbStatus,
    uptime: process.uptime()
  });
});

// MongoDB Connection Configuration
const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 5000;
const MAX_RETRIES = 5;
const RETRY_INTERVAL = 5000; // 5 seconds

// MongoDB connection options
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4,
  maxPoolSize: 10,
  minPoolSize: 5,
  retryWrites: true,
  retryReads: true
};

// Function to connect to MongoDB with retry logic
async function connectWithRetry(retries = MAX_RETRIES) {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, mongooseOptions);
    console.log('Successfully connected to MongoDB.');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    if (retries > 0) {
      console.log(`Retrying connection... (${retries} attempts remaining)`);
      setTimeout(() => connectWithRetry(retries - 1), RETRY_INTERVAL);
    } else {
      console.error('Max retries reached. Please check your MongoDB connection.');
      // Don't exit process, keep trying to reconnect
      setTimeout(() => connectWithRetry(MAX_RETRIES), RETRY_INTERVAL);
    }
  }
}

// Initial connection
connectWithRetry();

// MongoDB connection event handlers
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
  // Attempt to reconnect
  setTimeout(() => connectWithRetry(MAX_RETRIES), RETRY_INTERVAL);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected. Attempting to reconnect...');
  setTimeout(() => connectWithRetry(MAX_RETRIES), RETRY_INTERVAL);
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected successfully');
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: err.errors
    });
  }
  
  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    return res.status(503).json({
      error: 'Database Error',
      message: 'Service temporarily unavailable',
      code: err.code
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Authentication Error',
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Authentication Error',
      message: 'Token expired'
    });
  }

  // Handle timeout errors
  if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
    return res.status(504).json({
      error: 'Timeout Error',
      message: 'Request timed out'
    });
  }

  // Handle network errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
    return res.status(503).json({
      error: 'Network Error',
      message: 'Service temporarily unavailable'
    });
  }

  // Default error response
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    requestId: req.id || 'unknown'
  });
});

// Add request timeout handling
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    console.error('Request timeout:', {
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
    res.status(504).json({
      error: 'Request Timeout',
      message: 'The request took too long to process'
    });
  });
  next();
});

// Add request ID for tracking
app.use((req, res, next) => {
  req.id = Math.random().toString(36).substring(7);
  next();
});

// Graceful shutdown function
async function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  try {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    
    // Close server
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Don't exit, try to recover
  setTimeout(() => {
    console.log('Attempting to recover from uncaught exception...');
  }, 1000);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit, try to recover
  setTimeout(() => {
    console.log('Attempting to recover from unhandled rejection...');
  }, 1000);
});

// Handle process termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server if not being imported
let server;
if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
