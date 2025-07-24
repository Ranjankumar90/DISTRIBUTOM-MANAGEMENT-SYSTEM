const express = require('express');
const Product = require('../models/Product');
const { auth, authorize } = require('../middleware/auth');
const { validateProduct } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/products
// @desc    Get all products
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      company,
      category,
      stockStatus,
      isActive = 'true'
    } = req.query;

    // Build query
    const query = {};
    
    if (isActive !== 'all') {
      query.isActive = isActive === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    if (company) {
      query.companyId = company;
    }

    if (category) {
      query.category = { $regex: category, $options: 'i' };
    }

    // Handle stock status filter
    if (stockStatus) {
      switch (stockStatus) {
        case 'out-of-stock':
          query.stock = 0;
          break;
        case 'low-stock':
          query.$expr = { $lte: ['$stock', '$minStockLevel'] };
          break;
        case 'in-stock':
          query.$expr = { $gt: ['$stock', '$minStockLevel'] };
          break;
      }
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    const products = await Product.find(query)
      .populate('companyId', 'name gstNumber')
      .sort(options.sort)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit);

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: products,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('companyId', 'name gstNumber address contactInfo');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/products
// @desc    Create new product
// @access  Private (Admin)
router.post('/', auth, authorize('admin'), validateProduct, async (req, res) => {
  try {
    // Ensure batchInfo fields are set from top-level if present
    const batchInfo = {
      batchNumber: req.body.batchNumber || (req.body.batchInfo && req.body.batchInfo.batchNumber),
      manufacturingDate: req.body.manufacturingDate || (req.body.batchInfo && req.body.batchInfo.manufacturingDate),
      expiryDate: req.body.expiryDate || (req.body.batchInfo && req.body.batchInfo.expiryDate),
    };
    const product = new Product({
      ...req.body,
      batchInfo,
      createdBy: req.user._id
    });

    await product.save();
    await product.populate('companyId', 'name gstNumber');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private (Admin)
router.put('/:id', auth, authorize('admin'), validateProduct, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Ensure batchInfo fields are set from top-level if present
    const batchInfo = {
      batchNumber: req.body.batchNumber || (req.body.batchInfo && req.body.batchInfo.batchNumber),
      manufacturingDate: req.body.manufacturingDate || (req.body.batchInfo && req.body.batchInfo.manufacturingDate),
      expiryDate: req.body.expiryDate || (req.body.batchInfo && req.body.batchInfo.expiryDate),
    };
    Object.assign(product, req.body, { batchInfo });
    await product.save();
    await product.populate('companyId', 'name gstNumber');

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private (Admin)
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Soft delete - just mark as inactive
    product.isActive = false;
    await product.save();

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/products/:id/stock
// @desc    Update product stock
// @access  Private (Admin)
router.put('/:id/stock', auth, authorize('admin'), async (req, res) => {
  try {
    const { stock, operation = 'set' } = req.body;

    if (typeof stock !== 'number' || stock < 0) {
      return res.status(400).json({
        success: false,
        message: 'Stock must be a non-negative number'
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Update stock based on operation
    switch (operation) {
      case 'add':
        product.stock += stock;
        break;
      case 'subtract':
        product.stock = Math.max(0, product.stock - stock);
        break;
      case 'set':
      default:
        product.stock = stock;
        break;
    }

    await product.save();

    res.json({
      success: true,
      message: 'Stock updated successfully',
      data: {
        productId: product._id,
        newStock: product.stock
      }
    });
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/products/low-stock
// @desc    Get products with low stock
// @access  Private (Admin)
router.get('/reports/low-stock', auth, authorize('admin'), async (req, res) => {
  try {
    const products = await Product.find({
      isActive: true,
      $expr: { $lte: ['$stock', '$minStockLevel'] }
    })
    .populate('companyId', 'name')
    .sort({ stock: 1 });

    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    console.error('Get low stock products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/products/expiring
// @desc    Get products expiring soon
// @access  Private (Admin)
router.get('/reports/expiring', auth, authorize('admin'), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parseInt(days));

    const products = await Product.find({
      isActive: true,
      'batchInfo.expiryDate': {
        $exists: true,
        $lte: expiryDate,
        $gte: new Date()
      }
    })
    .populate('companyId', 'name')
    .sort({ 'batchInfo.expiryDate': 1 });

    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    console.error('Get expiring products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;