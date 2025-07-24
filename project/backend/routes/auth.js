const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Salesman = require('../models/Salesman');
const { auth } = require('../middleware/auth');
const { validateUser } = require('../middleware/validation');

const router = express.Router();

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { mobile, password } = req.body;
    console.log('Login attempt:', mobile, password);

    // Validate input
    if (!mobile || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide mobile number and password'
      });
    }

    // Check if user exists
    const user = await User.findOne({ mobile }).select('+password');
    console.log('User found:', user);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    console.log('Password match:', isMatch);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Get additional user data based on role
    let userData = user.toJSON();
    
    if (user.role === 'customer') {
      const customer = await Customer.findOne({ userId: user._id });
      userData.customerData = customer;
    } else if (user.role === 'salesman') {
      const salesman = await Salesman.findOne({ userId: user._id });
      userData.salesmanData = salesman;
    }

    res.json({
      success: true,
      token,
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/register
// @desc    Register new user (Admin only)
// @access  Private (Admin)
router.post('/register', auth, validateUser, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { mobile, password, role, name, ...additionalData } = req.body;

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
      role,
      name,
      createdBy: req.user._id
    });

    await user.save();

    // Create role-specific data
    if (role === 'customer') {
      const customer = new Customer({
        userId: user._id,
        address: additionalData.address || '',
        gstNumber: additionalData.gstNumber,
        creditLimit: additionalData.creditLimit || 0,
        territory: additionalData.territory
      });
      await customer.save();
    } else if (role === 'salesman') {
      const salesman = new Salesman({
        userId: user._id,
        territory: additionalData.territory || '',
        targetAmount: additionalData.targetAmount || 0,
        commissionRate: additionalData.commissionRate || 0
      });
      await salesman.save();
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    let userData = req.user.toJSON();
    
    if (req.user.role === 'customer') {
      const customer = await Customer.findOne({ userId: req.user._id });
      userData.customerData = customer;
    } else if (req.user.role === 'salesman') {
      const salesman = await Salesman.findOne({ userId: req.user._id });
      userData.salesmanData = salesman;
    }

    res.json({
      success: true,
      user: userData
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    
    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;