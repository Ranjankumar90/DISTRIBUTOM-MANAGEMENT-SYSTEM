const express = require('express');
const Company = require('../models/Company');
const Product = require('../models/product');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/companies
// @desc    Get all companies
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
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
        { gstNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { name: 1 }
    };

    const companies = await Company.find(query)
      .sort(options.sort)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit);

    const total = await Company.countDocuments(query);

    res.json({
      success: true,
      data: companies,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit)
      }
    });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/companies/:id
// @desc    Get single company
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Get company products
    const products = await Product.find({ companyId: company._id, isActive: true })
      .select('name sku stock minStockLevel');

    res.json({
      success: true,
      data: {
        ...company.toObject(),
        products
      }
    });
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/companies
// @desc    Create new company
// @access  Private (Admin)
router.post('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, gstNumber, address, contactInfo } = req.body;

    // Validate required fields
    if (!name || !gstNumber) {
      return res.status(400).json({
        success: false,
        message: 'Company name and GST number are required'
      });
    }

    // Check if company with same GST number exists
    const existingCompany = await Company.findOne({ gstNumber });
    if (existingCompany) {
      return res.status(400).json({
        success: false,
        message: 'Company with this GST number already exists'
      });
    }

    const company = new Company({
      name,
      gstNumber,
      address,
      contactInfo,
      createdBy: req.user._id
    });

    await company.save();

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      data: company
    });
  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/companies/:id
// @desc    Update company
// @access  Private (Admin)
router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    const { name, gstNumber, address, contactInfo } = req.body;

    // Check if GST number is being changed and if it already exists
    if (gstNumber && gstNumber !== company.gstNumber) {
      const existingCompany = await Company.findOne({ gstNumber });
      if (existingCompany) {
        return res.status(400).json({
          success: false,
          message: 'Company with this GST number already exists'
        });
      }
    }

    // Update company
    Object.assign(company, {
      name: name || company.name,
      gstNumber: gstNumber || company.gstNumber,
      address: address || company.address,
      contactInfo: contactInfo || company.contactInfo
    });

    await company.save();

    res.json({
      success: true,
      message: 'Company updated successfully',
      data: company
    });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/companies/:id
// @desc    Delete company
// @access  Private (Admin)
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Check if company has products
    const productCount = await Product.countDocuments({ companyId: company._id });
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete company with existing products'
      });
    }

    // Soft delete - mark as inactive
    company.isActive = false;
    await company.save();

    res.json({
      success: true,
      message: 'Company deleted successfully'
    });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/companies/:id/products
// @desc    Get company products
// @access  Private
router.get('/:id/products', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive = 'true' } = req.query;

    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    const query = { companyId: req.params.id };
    if (isActive !== 'all') {
      query.isActive = isActive === 'true';
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { name: 1 }
    };

    const products = await Product.find(query)
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
    console.error('Get company products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;