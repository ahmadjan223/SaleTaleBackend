const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const retailerRoutes = require('./routes/retailer.routes');
const productRoutes = require('./routes/product.routes');
const saleRoutes = require('./routes/sale.routes');
const salesmanRoutes = require('./routes/salesman.routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 5000;

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Successfully connected to MongoDB.'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Basic error handling for MongoDB connection
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Routes
app.use('/api/retailers', retailerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/salesman', salesmanRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
