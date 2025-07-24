const express = require('express');
const User = require('../models/User');
const Customer = require('../models/Customer');
const { auth, authorize } = require('../middleware/auth');
const { validateUser, validateCustomer } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/customers
// @desc    Get all customers
// @access  Private (Admin, Salesman)
router.get('/', auth, authorize('admin', 'salesman'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      territory,
      customerType,
      isActive = 'true'
    } = req.query;

    // Build query
    const query = {};
    
    if (search) {
      // Search in populated user data
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { mobile: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      const userIds = users.map(user => user._id);
      query.userId = { $in: userIds };
    }

    if (territory) {
      query.territory = { $regex: territory, $options: 'i' };
    }

    if (customerType) {
      query.customerType = customerType;
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    const customers = await Customer.find(query)
      .populate({
        path: 'userId',
        select: 'name mobile isActive createdAt',
        match: isActive !== 'all' ? { isActive: isActive === 'true' } : {}
      })
      .sort(options.sort)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit);

    // Filter out customers where userId is null (due to isActive filter)
    const filteredCustomers = customers.filter(customer => customer.userId);

    const total = await Customer.countDocuments(query);

    res.json({
      success: true,
      data: filteredCustomers,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit)
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/customers/me
// @desc    Get current customer's profile
// @access  Private (Customer)
router.get('/me', auth, authorize('customer'), async (req, res) => {
  try {
    const customer = await Customer.findOne({ userId: req.user._id }).populate('userId', 'name mobile isActive createdAt');
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer profile not found' });
    }
    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/customers/:id
// @desc    Get single customer
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('userId', 'name mobile isActive createdAt lastLogin');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check access permissions for customer role
    if (req.user.role === 'customer') {
      const userCustomer = await Customer.findOne({ userId: req.user._id });
      if (!userCustomer || customer._id.toString() !== userCustomer._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/customers
// @desc    Create new customer
// @access  Private (Admin)
router.post('/', auth, authorize('admin'), validateUser, validateCustomer, async (req, res) => {
  try {
    const { mobile, password, name, address, gstNumber, creditLimit, territory, customerType, paymentTerms } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ mobile });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this mobile number already exists'
      });
    }

    // Create user
    const user = new User({
      mobile,
      password,
      role: 'customer',
      name,
      createdBy: req.user._id
    });

    await user.save();

    // Create customer
    const customer = new Customer({
      userId: user._id,
      address,
      gstNumber,
      creditLimit: creditLimit || 0,
      territory,
      customerType: customerType || 'retail',
      paymentTerms: paymentTerms || 30
    });

    await customer.save();
    await customer.populate('userId', 'name mobile isActive createdAt');

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/customers/:id
// @desc    Update customer
// @access  Private (Admin)
router.put('/:id', auth, authorize('admin'), validateCustomer, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const { name, address, gstNumber, creditLimit, territory, customerType, paymentTerms } = req.body;

    // Update user data
    if (name) {
      await User.findByIdAndUpdate(customer.userId, { name });
    }

    // Update customer data
    Object.assign(customer, {
      address: address || customer.address,
      gstNumber,
      creditLimit: creditLimit !== undefined ? creditLimit : customer.creditLimit,
      territory: territory || customer.territory,
      customerType: customerType || customer.customerType,
      paymentTerms: paymentTerms !== undefined ? paymentTerms : customer.paymentTerms
    });

    await customer.save();
    await customer.populate('userId', 'name mobile isActive createdAt');

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: customer
    });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/customers/:id/status
// @desc    Update customer status
// @access  Private (Admin)
router.put('/:id/status', auth, authorize('admin'), async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value'
      });
    }

    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Update user status
    await User.findByIdAndUpdate(customer.userId, { isActive });

    res.json({
      success: true,
      message: `Customer ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Update customer status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/customers/:id/credit-limit
// @desc    Update customer credit limit
// @access  Private (Admin)
router.put('/:id/credit-limit', auth, authorize('admin'), async (req, res) => {
  try {
    const { creditLimit } = req.body;

    if (typeof creditLimit !== 'number' || creditLimit < 0) {
      return res.status(400).json({
        success: false,
        message: 'Credit limit must be a non-negative number'
      });
    }

    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const oldCreditLimit = customer.creditLimit;
    customer.creditLimit = creditLimit;
    await customer.save();

    res.json({
      success: true,
      message: 'Credit limit updated successfully',
      data: {
        customerId: customer._id,
        oldCreditLimit,
        newCreditLimit: creditLimit,
        availableCredit: creditLimit - customer.outstandingAmount
      }
    });
  } catch (error) {
    console.error('Update credit limit error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/customers/:id/outstanding
// @desc    Get customer outstanding details
// @access  Private
router.get('/:id/outstanding', auth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('userId', 'name mobile');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check access permissions for customer role
    if (req.user.role === 'customer') {
      const userCustomer = await Customer.findOne({ userId: req.user._id });
      if (!userCustomer || customer._id.toString() !== userCustomer._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.json({
      success: true,
      data: {
        customerId: customer._id,
        customerName: customer.userId.name,
        creditLimit: customer.creditLimit,
        outstandingAmount: customer.outstandingAmount,
        availableCredit: customer.creditLimit - customer.outstandingAmount,
        utilizationPercentage: customer.creditLimit > 0 ? 
          (customer.outstandingAmount / customer.creditLimit) * 100 : 0
      }
    });
  } catch (error) {
    console.error('Get customer outstanding error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/customers/:id
// @desc    Delete customer
// @access  Private (Admin)
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check if customer has outstanding amount
    if (customer.outstandingAmount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete customer with outstanding amount'
      });
    }

    // Soft delete - deactivate user instead of deleting
    await User.findByIdAndUpdate(customer.userId, { isActive: false });

    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;