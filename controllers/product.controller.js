const Product = require('../models/product.model');

exports.createProduct = async (req, res) => {
  try {
    console.log('Received request to create product with data:', req.body);

    const product = new Product(req.body);
    await product.save();

    console.log('Product saved successfully:', product);

    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error.message);
    res.status(400).json({ message: error.message });
  }
};

exports.getProducts = async (req, res) => {
  try {
    console.log('Received request to fetch all products');

    const products = await Product.find();

    console.log(`Fetched ${products.length} products`);

    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error.message);
    res.status(500).json({ message: error.message });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    console.log('[GET ALL PRODUCTS]');

    const products = await Product.find({});

    products.forEach(product => {
      console.log(`[${product.name}]`);
    });

    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error.message);
    res.status(500).json({ message: error.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    console.log('Received request to fetch product with ID:', req.params.id);

    const product = await Product.findById(req.params.id);

    if (!product) {
      console.warn('Product not found for ID:', req.params.id);
      return res.status(404).json({ message: 'Product not found' });
    }

    console.log('Fetched product:', product);

    res.json(product);
  } catch (error) {
    console.error('Error fetching product by ID:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// Admin Delete Product
exports.adminDeleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    console.log(`\n[ADMIN DELETE PRODUCT] ID: ${productId}`);

    const product = await Product.findByIdAndDelete(productId);

    if (!product) {
      console.log('[ERROR] Product not found for admin deletion');
      return res.status(404).json({ message: 'Product not found' });
    }

    console.log(`[ADMIN] Product [${product.name}] deleted successfully`);
    res.json({ message: 'Product deleted successfully by admin' });
  } catch (error) {
    console.log('[ERROR] Admin deleting product:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// Placeholder for a regular delete if needed, e.g., by a specific user type (if products were user-tied)
// exports.deleteProduct = async (req, res) => { ... };

// Update Product
exports.updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    console.log('Received request to update product with ID:', productId, 'Data:', req.body);

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      console.warn('Product not found for update, ID:', productId);
      return res.status(404).json({ message: 'Product not found' });
    }

    console.log('Product updated successfully:', updatedProduct);
    res.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error.message);
    res.status(400).json({ message: error.message });
  }
};

// Admin Get Product By ID
exports.adminGetProductById= async (req, res) => {
  try {
    const productId = req.params.id;
    console.log(`\n[ADMIN GET PRODUCT BY ID] ID: ${productId}`);

    // Select fields relevant for a tooltip or quick view, e.g., name, price, description
    const product = await Product.findById(productId).select('name price description _id'); 

    if (!product) {
      console.log('[ERROR] Product not found for admin view by ID');
      return res.status(404).json({ message: 'Product not found' });
    }

    console.log(`[ADMIN] Fetched Product: [${product.name}]`);
    res.json(product);
  } catch (error) {
    console.log('[ERROR] Admin fetching product by ID:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// Toggle product active status
exports.toggleProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    if (typeof active !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Active status must be a boolean value'
      });
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { active },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: `Product ${active ? 'activated' : 'deactivated'} successfully`,
      data: product
    });

  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating product status',
      error: error.message
    });
  }
};
