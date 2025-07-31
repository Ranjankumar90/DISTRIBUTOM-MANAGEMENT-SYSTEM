const express = require('express');
const LedgerEntry = require('../models/LedgerEntry');
const Customer = require('../models/Customer');
const { auth, authorize } = require('../middleware/auth');
const Order = require('../models/Order');
const Collection = require('../models/Collection');

const router = express.Router();

// @route   GET /api/ledger
// @desc    Get ledger entries
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      customerId,
      type,
      startDate,
      endDate
    } = req.query;

    // Build query based on user role
    const query = {};

    if (req.user.role === 'customer') {
      // For customer role, get their customer profile and filter by their customerId
      const customer = await Customer.findOne({ userId: req.user._id });
      if (customer) {
        query.customerId = customer._id;
      } else {
        // If no customer profile found, return empty result
        return res.json({
          success: true,
          data: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0
          }
        });
      }
    } else if (customerId && customerId !== 'all') {
      // For admin/salesman, filter by specific customer if provided
      query.customerId = customerId;
    }
    // If no customerId provided for admin/salesman, show all entries

    // Apply filters
    if (type && type !== 'all') {
      query.type = type;
    }

    if (startDate || endDate) {
      query.entryDate = {};
      if (startDate) query.entryDate.$gte = new Date(startDate);
      if (endDate) query.entryDate.$lte = new Date(endDate);
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { entryDate: -1, createdAt: -1 }
    };

    const entries = await LedgerEntry.find(query)
      .populate({
        path: 'customerId',
        populate: { path: 'userId', select: 'name mobile' }
      })
      .sort(options.sort)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit);

    const total = await LedgerEntry.countDocuments(query);

    res.json({
      success: true,
      data: entries,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit)
      }
    });
  } catch (error) {
    console.error('Get ledger entries error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/ledger/customer/:customerId
// @desc    Get customer ledger with running balance
// @access  Private
router.get('/customer/:customerId', auth, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { startDate, endDate } = req.query;

    // Check access permissions for customer role
    if (req.user.role === 'customer') {
      const userCustomer = await Customer.findOne({ userId: req.user._id });
      if (!userCustomer || customerId !== userCustomer._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    // Verify customer exists
    const customer = await Customer.findById(customerId)
      .populate('userId', 'name mobile');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Build query
    const query = { customerId };

    if (startDate || endDate) {
      query.entryDate = {};
      if (startDate) query.entryDate.$gte = new Date(startDate);
      if (endDate) query.entryDate.$lte = new Date(endDate);
    }

    // Get all entries for this customer
    const entries = await LedgerEntry.find(query)
      .sort({ entryDate: 1, createdAt: 1 });

    // Calculate running balance
    let runningBalance = 0;
    const entriesWithBalance = entries.map(entry => {
      if (entry.type === 'debit' || entry.type === 'order') {
        runningBalance += entry.amount;
      } else if (entry.type === 'credit' || entry.type === 'payment') {
        runningBalance -= entry.amount;
      } else if (entry.type === 'adjustment') {
        runningBalance += entry.amount; // Adjustment can be positive or negative
      } else if (entry.type === 'opening_balance') {
        runningBalance = entry.amount;
      }

      return {
        ...entry.toObject(),
        runningBalance
      };
    });

    // Calculate summary
    const summary = {
      totalDebits: entries
        .filter(e => e.type === 'debit' || e.type === 'order')
        .reduce((sum, e) => sum + e.amount, 0),
      totalCredits: entries
        .filter(e => e.type === 'credit' || e.type === 'payment')
        .reduce((sum, e) => sum + e.amount, 0),
      currentBalance: runningBalance,
      entryCount: entries.length
    };

    res.json({
      success: true,
      data: {
        customer: {
          id: customer._id,
          name: customer.userId.name,
          mobile: customer.userId.mobile,
          creditLimit: customer.creditLimit,
          outstandingAmount: customer.outstandingAmount
        },
        entries: entriesWithBalance.reverse(), // Show latest first
        summary
      }
    });
  } catch (error) {
    console.error('Get customer ledger error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/ledger
// @desc    Create manual ledger entry
// @access  Private (Admin)
router.post('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { customerId, entryDate, description, type, amount, reference } = req.body;

    // Validate required fields
    if (!customerId || !entryDate || !description || !type || !amount) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Verify customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Create ledger entry
    const ledgerEntry = new LedgerEntry({
      customerId,
      entryDate: new Date(entryDate),
      description,
      type,
      amount,
      reference,
      createdBy: req.user._id
    });

    await ledgerEntry.save();

    // Update customer outstanding amount if needed
    if (type === 'debit' || type === 'adjustment') {
      customer.outstandingAmount += amount;
    } else if (type === 'credit') {
      customer.outstandingAmount = Math.max(0, customer.outstandingAmount - amount);
    }

    await customer.save();
    await ledgerEntry.populate({
      path: 'customerId',
      populate: { path: 'userId', select: 'name mobile' }
    });

    res.status(201).json({
      success: true,
      message: 'Ledger entry created successfully',
      data: ledgerEntry
    });
  } catch (error) {
    console.error('Create ledger entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/ledger/:id
// @desc    Update ledger entry
// @access  Private (Admin)
router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const ledgerEntry = await LedgerEntry.findById(req.params.id);

    if (!ledgerEntry) {
      return res.status(404).json({
        success: false,
        message: 'Ledger entry not found'
      });
    }

    const { description, amount, reference } = req.body;

    // Calculate the difference in amount to adjust customer outstanding
    const oldAmount = ledgerEntry.amount;
    const newAmount = amount || oldAmount;
    const amountDifference = newAmount - oldAmount;

    // Update ledger entry
    Object.assign(ledgerEntry, {
      description: description || ledgerEntry.description,
      amount: newAmount,
      reference: reference || ledgerEntry.reference
    });

    await ledgerEntry.save();

    // Adjust customer outstanding amount
    if (amountDifference !== 0) {
      const customer = await Customer.findById(ledgerEntry.customerId);
      if (customer) {
        if (ledgerEntry.type === 'debit' || ledgerEntry.type === 'order' || ledgerEntry.type === 'adjustment') {
          customer.outstandingAmount += amountDifference;
        } else if (ledgerEntry.type === 'credit' || ledgerEntry.type === 'payment') {
          customer.outstandingAmount = Math.max(0, customer.outstandingAmount - amountDifference);
        }
        await customer.save();
      }
    }

    await ledgerEntry.populate({
      path: 'customerId',
      populate: { path: 'userId', select: 'name mobile' }
    });

    res.json({
      success: true,
      message: 'Ledger entry updated successfully',
      data: ledgerEntry
    });
  } catch (error) {
    console.error('Update ledger entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/ledger/:id
// @desc    Delete ledger entry
// @access  Private (Admin)
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const ledgerEntry = await LedgerEntry.findById(req.params.id);

    if (!ledgerEntry) {
      return res.status(404).json({
        success: false,
        message: 'Ledger entry not found'
      });
    }

    // Don't allow deletion of system-generated entries
    if (ledgerEntry.referenceId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete system-generated ledger entries'
      });
    }

    // Adjust customer outstanding amount
    const customer = await Customer.findById(ledgerEntry.customerId);
    if (customer) {
      if (ledgerEntry.type === 'debit' || ledgerEntry.type === 'adjustment') {
        customer.outstandingAmount = Math.max(0, customer.outstandingAmount - ledgerEntry.amount);
      } else if (ledgerEntry.type === 'credit') {
        customer.outstandingAmount += ledgerEntry.amount;
      }
      await customer.save();
    }

    await LedgerEntry.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Ledger entry deleted successfully'
    });
  } catch (error) {
    console.error('Delete ledger entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;