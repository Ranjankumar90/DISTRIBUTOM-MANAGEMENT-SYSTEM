const express = require('express');
const User = require('../models/User');
const Salesman = require('../models/Salesman');
const { auth, authorize } = require('../middleware/auth');
const { validateUser } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/salesmen
// @desc    Get all salesmen
// @access  Private (Admin)
router.get('/', auth, authorize('admin', 'salesman'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      territory,
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

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    const salesmen = await Salesman.find(query)
      .populate({
        path: 'userId',
        select: 'name mobile isActive createdAt',
        match: isActive !== 'all' ? { isActive: isActive === 'true' } : {}
      })
      .sort(options.sort)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit);

    // Filter out salesmen where userId is null (due to isActive filter)
    const filteredSalesmen = salesmen.filter(salesman => salesman.userId);

    const total = await Salesman.countDocuments(query);

    res.json({
      success: true,
      data: filteredSalesmen,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit)
      }
    });
  } catch (error) {
    console.error('Get salesmen error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/salesmen/:id
// @desc    Get single salesman
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const salesman = await Salesman.findById(req.params.id)
      .populate('userId', 'name mobile isActive createdAt lastLogin');

    if (!salesman) {
      return res.status(404).json({
        success: false,
        message: 'Salesman not found'
      });
    }

    // Check access permissions for salesman role
    if (req.user.role === 'salesman') {
      const userSalesman = await Salesman.findOne({ userId: req.user._id });
      if (!userSalesman || salesman._id.toString() !== userSalesman._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.json({
      success: true,
      data: salesman
    });
  } catch (error) {
    console.error('Get salesman error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/salesmen
// @desc    Create new salesman
// @access  Private (Admin)
router.post('/', auth, authorize('admin'), validateUser, async (req, res) => {
  try {
    const { mobile, password, name, territory, targetAmount, commissionRate } = req.body;

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
      role: 'salesman',
      name,
      createdBy: req.user._id
    });

    await user.save();

    // Create salesman
    const salesman = new Salesman({
      userId: user._id,
      territory: territory || '',
      targetAmount: targetAmount || 0,
      commissionRate: commissionRate || 0
    });

    await salesman.save();
    await salesman.populate('userId', 'name mobile isActive createdAt');

    res.status(201).json({
      success: true,
      message: 'Salesman created successfully',
      data: salesman
    });
  } catch (error) {
    console.error('Create salesman error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/salesmen/:id
// @desc    Update salesman
// @access  Private (Admin)
router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const salesman = await Salesman.findById(req.params.id);

    if (!salesman) {
      return res.status(404).json({
        success: false,
        message: 'Salesman not found'
      });
    }

    const { name, territory, targetAmount, commissionRate } = req.body;

    // Update user data
    if (name) {
      await User.findByIdAndUpdate(salesman.userId, { name });
    }

    // Update salesman data
    Object.assign(salesman, {
      territory: territory || salesman.territory,
      targetAmount: targetAmount !== undefined ? targetAmount : salesman.targetAmount,
      commissionRate: commissionRate !== undefined ? commissionRate : salesman.commissionRate
    });

    await salesman.save();
    await salesman.populate('userId', 'name mobile isActive createdAt');

    res.json({
      success: true,
      message: 'Salesman updated successfully',
      data: salesman
    });
  } catch (error) {
    console.error('Update salesman error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/salesmen/:id/status
// @desc    Update salesman status
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

    const salesman = await Salesman.findById(req.params.id);

    if (!salesman) {
      return res.status(404).json({
        success: false,
        message: 'Salesman not found'
      });
    }

    // Update user status
    await User.findByIdAndUpdate(salesman.userId, { isActive });

    res.json({
      success: true,
      message: `Salesman ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Update salesman status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/salesmen/:id/target
// @desc    Update salesman target
// @access  Private (Admin)
router.put('/:id/target', auth, authorize('admin'), async (req, res) => {
  try {
    const { targetAmount } = req.body;

    if (typeof targetAmount !== 'number' || targetAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Target amount must be a non-negative number'
      });
    }

    const salesman = await Salesman.findById(req.params.id);

    if (!salesman) {
      return res.status(404).json({
        success: false,
        message: 'Salesman not found'
      });
    }

    const oldTarget = salesman.targetAmount;
    salesman.targetAmount = targetAmount;
    await salesman.save();

    res.json({
      success: true,
      message: 'Target updated successfully',
      data: {
        salesmanId: salesman._id,
        oldTarget,
        newTarget: targetAmount,
        achievementPercentage: targetAmount > 0 ? (salesman.achievedAmount / targetAmount) * 100 : 0
      }
    });
  } catch (error) {
    console.error('Update target error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;