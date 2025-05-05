const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const retailerRoutes = require('../routes/retailer.routes');
const productRoutes = require('../routes/product.routes');
const saleRoutes = require('../routes/sale.routes');
const salesmanRoutes = require('../routes/salesman.routes');
const authRoutes = require('../routes/auth');
const userRoutes = require('../routes/users');

const app = express();

app.use(cors({
  origin: [
    'http://localhost:19006',
    'http://localhost:5000',
    'http://localhost:3000',
    `http://${process.env.ip}:5000`,
    'https://*.vercel.app',  // Allow all Vercel deployments
    process.env.FRONTEND_URL  // Allow your frontend URL if set
  ].filter(Boolean),  // Remove any undefined values
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Salesman App Backend (Vercel)',
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

app.use('/api/retailers', retailerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/salesman', salesmanRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB (Vercel).'))
  .catch((err) => console.error('MongoDB connection error:', err));

module.exports = app;