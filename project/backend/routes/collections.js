const express = require('express');
const Collection = require('../models/Collection');
const Customer = require('../models/Customer');
const Salesman = require('../models/Salesman');
const LedgerEntry = require('../models/LedgerEntry');
const { auth, authorize } = require('../middleware/auth');
const { validateCollection } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/collections
// @desc    Get all collections
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      customerId,
      salesmanId,
      status,
      paymentMode,
      startDate,
      endDate
    } = req.query;

    // Build query based on user role
    const query = {};

    if (req.user.role === 'customer') {
      const customer = await Customer.findOne({ userId: req.user._id });
      if (customer) {
        query.customerId = customer._id;
      }
    } else if (req.user.role === 'salesman') {
      const salesman = await Salesman.findOne({ userId: req.user._id });
      if (salesman) {
        query.salesmanId = salesman._id;
      }
    }

    // Apply filters
    if (customerId && req.user.role === 'admin') {
      query.customerId = customerId;
    }

    if (salesmanId && req.user.role === 'admin') {
      query.salesmanId = salesmanId;
    }

    if (status) {
      query.status = status;
    }

    if (paymentMode) {
      query.paymentMode = paymentMode;
    }

    if (startDate || endDate) {
      query.collectionDate = {};
      if (startDate) query.collectionDate.$gte = new Date(startDate);
      if (endDate) query.collectionDate.$lte = new Date(endDate);
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { collectionDate: -1 }
    };

    const collections = await Collection.find(query)
      .populate([
        {
          path: 'customerId',
          populate: { path: 'userId', select: 'name mobile' }
        },
        {
          path: 'salesmanId',
          populate: { path: 'userId', select: 'name mobile' }
        }
      ])
      .sort(options.sort)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit);

    const total = await Collection.countDocuments(query);

    res.json({
      success: true,
      data: collections,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit)
      }
    });
  } catch (error) {
    console.error('Get collections error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/collections/:id
// @desc    Get single collection
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id)
      .populate([
        {
          path: 'customerId',
          populate: { path: 'userId', select: 'name mobile' }
        },
        {
          path: 'salesmanId',
          populate: { path: 'userId', select: 'name mobile' }
        }
      ]);

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'customer') {
      const customer = await Customer.findOne({ userId: req.user._id });
      if (!customer || collection.customerId._id.toString() !== customer._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    } else if (req.user.role === 'salesman') {
      const salesman = await Salesman.findOne({ userId: req.user._id });
      if (!salesman || collection.salesmanId._id.toString() !== salesman._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.json({
      success: true,
      data: collection
    });
  } catch (error) {
    console.error('Get collection error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/collections
// @desc    Create new collection
// @access  Private (Salesman, Admin)
router.post('/', auth, authorize('salesman', 'admin'), validateCollection, async (req, res) => {
  try {
    const { customerId, amount, paymentMode, paymentDetails, notes } = req.body;

    // Verify customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Get salesman ID
    let salesmanId = null;
    if (req.user.role === 'salesman') {
      const salesman = await Salesman.findOne({ userId: req.user._id });
      if (!salesman) {
        return res.status(404).json({
          success: false,
          message: 'Salesman profile not found'
        });
      }
      salesmanId = salesman._id;
    } else if (req.body.salesmanId) {
      salesmanId = req.body.salesmanId;
    }

    if (!salesmanId) {
      return res.status(400).json({
        success: false,
        message: 'Salesman is required for collection'
      });
    }

    // Create collection with status 'pending'
    const collection = new Collection({
      customerId,
      salesmanId,
      amount,
      paymentMode,
      paymentDetails,
      notes,
      createdBy: req.user._id,
      status: 'pending'
    });

    await collection.save();

    // Do NOT update customer outstanding or create ledger entry here

    // Populate collection data for response
    await collection.populate([
      {
        path: 'customerId',
        populate: { path: 'userId', select: 'name mobile' }
      },
      {
        path: 'salesmanId',
        populate: { path: 'userId', select: 'name mobile' }
      }
    ]);

    res.status(201).json({
      success: true,
      message: 'Collection recorded and pending admin approval',
      data: collection
    });
  } catch (error) {
    console.error('Create collection error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/collections/:id/status
// @desc    Update collection status
// @access  Private (Admin)
router.put('/:id/status', auth, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'approved', 'cleared', 'bounced', 'cancelled', 'failed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found'
      });
    }

    const oldStatus = collection.status;
    collection.status = status;

    // Handle admin approval/rejection from 'pending' status
    if (oldStatus === 'pending' && status === 'approved') {
      // Update customer outstanding amount (reduce it)
      const customer = await Customer.findById(collection.customerId);
      if (customer) {
        customer.outstandingAmount = Math.max(0, customer.outstandingAmount - collection.amount);
        await customer.save();
      }
      // Create ledger entry
      const ledgerEntry = new LedgerEntry({
        customerId: collection.customerId,
        entryDate: new Date(),
        description: `Payment ${collection.collectionNumber} - Approved`,
        type: 'payment',
        amount: collection.amount,
        reference: collection.collectionNumber,
        referenceId: collection._id,
        referenceModel: 'Collection',
        createdBy: req.user._id
      });
      await ledgerEntry.save();
    } else if (oldStatus === 'pending' && status === 'failed') {
      // Do nothing to ledger, just mark as failed
    }

    // Existing logic for cleared/bounced/cancelled
    if (oldStatus === 'cleared' && status === 'bounced') {
      // If payment bounced, add back to customer outstanding
      const customer = await Customer.findById(collection.customerId);
      if (customer) {
        customer.outstandingAmount += collection.amount;
        await customer.save();
      }
      // Create reversal ledger entry
      const ledgerEntry = new LedgerEntry({
        customerId: collection.customerId,
        entryDate: new Date(),
        description: `Payment ${collection.collectionNumber} - Bounced`,
        type: 'debit',
        amount: collection.amount,
        reference: collection.collectionNumber,
        referenceId: collection._id,
        referenceModel: 'Collection',
        createdBy: req.user._id
      });
      await ledgerEntry.save();
    } else if (oldStatus === 'bounced' && status === 'cleared') {
      // If payment cleared after bounce, reduce outstanding again
      const customer = await Customer.findById(collection.customerId);
      if (customer) {
        customer.outstandingAmount = Math.max(0, customer.outstandingAmount - collection.amount);
        await customer.save();
      }
      // Create ledger entry
      const ledgerEntry = new LedgerEntry({
        customerId: collection.customerId,
        entryDate: new Date(),
        description: `Payment ${collection.collectionNumber} - Cleared`,
        type: 'credit',
        amount: collection.amount,
        reference: collection.collectionNumber,
        referenceId: collection._id,
        referenceModel: 'Collection',
        createdBy: req.user._id
      });
      await ledgerEntry.save();
    }

    await collection.save();

    res.json({
      success: true,
      message: 'Collection status updated successfully',
      data: {
        collectionId: collection._id,
        oldStatus,
        newStatus: status
      }
    });
  } catch (error) {
    console.error('Update collection status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/collections/:id
// @desc    Cancel collection
// @access  Private (Admin)
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found'
      });
    }

    // Can only cancel pending collections
    if (collection.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Can only cancel pending collections'
      });
    }

    // If collection was already reducing outstanding, add it back
    if (collection.status === 'cleared') {
      const customer = await Customer.findById(collection.customerId);
      if (customer) {
        customer.outstandingAmount += collection.amount;
        await customer.save();
      }
    }

    // Create reversal ledger entry
    const ledgerEntry = new LedgerEntry({
      customerId: collection.customerId,
      entryDate: new Date(),
      description: `Payment ${collection.collectionNumber} - Cancelled`,
      type: 'debit',
      amount: collection.amount,
      reference: collection.collectionNumber,
      referenceId: collection._id,
      referenceModel: 'Collection',
      createdBy: req.user._id
    });

    await ledgerEntry.save();

    // Update collection status
    collection.status = 'cancelled';
    await collection.save();

    res.json({
      success: true,
      message: 'Collection cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel collection error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;