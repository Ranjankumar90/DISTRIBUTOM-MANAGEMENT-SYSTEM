const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// GET /api/orders - fetch all orders
router.get('/', async (req, res) => {
  try {
    let query = {};
    
    // Filter by customerId if provided
    if (req.query.customerId) {
      query.customerId = req.query.customerId;
    }
    
    // Add pagination and limit support
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;
    const skip = req.query.skip ? parseInt(req.query.skip) : 0;
    
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate({ path: 'customerId', populate: { path: 'userId', select: 'name mobile' } });
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/orders - create a new order
router.post('/', async (req, res) => {
  try {
    const order = new Order({
      ...req.body,
      createdBy: req.user?._id || req.body.createdBy // fallback for testing
    });
    await order.save();
    await order.populate([
      { path: 'customerId', populate: { path: 'userId', select: 'name mobile' } },
      { path: 'salesmanId', populate: { path: 'userId', select: 'name mobile' } },
      { path: 'items.productId', select: 'name unit companyId' }
    ]);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    console.error('Order creation error:', error);
    console.error('Request body:', req.body);
    res.status(500).json({ success: false, message: 'Server error', error: error.message, details: error });
  }
});

// PUT /api/orders/:id - update an order
router.put('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    // Prevent editing if delivered
    if (order.status === 'delivered') {
      return res.status(400).json({ success: false, message: 'Delivered orders cannot be edited' });
    }
    Object.assign(order, req.body);
    await order.save();
    await order.populate([
      { path: 'customerId', populate: { path: 'userId', select: 'name mobile' } },
      { path: 'salesmanId', populate: { path: 'userId', select: 'name mobile' } },
      { path: 'items.productId', select: 'name unit companyId' }
    ]);
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// PUT /api/orders/:id/status - update order status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    const previousStatus = order.status;
    order.status = status;
    
    // Auto-generate bill number on delivery (or confirmation if you want both to have bill numbers)
    if ((status === 'delivered' || status === 'confirmed') && !order.billNumber) {
      const date = new Date(order.orderDate || Date.now());
      const year = date.getFullYear();
      // Count all orders with a bill number for this year to get the next bill number
      const count = await Order.countDocuments({
        billNumber: { $regex: `^INV-${year}-` }
      }) + 1;
      const padded = String(count).padStart(6, '0');
      order.billNumber = `INV-${year}-${padded}`;
    }
    
    await order.save();
    
    // Create ledger entry if delivered and customer exists
    if (status === 'delivered' && order.customerId) {
      try {
        const LedgerEntry = require('../models/LedgerEntry');
        const Customer = require('../models/Customer');
        
        // Check if ledger entry already exists for this order
        const existingEntry = await LedgerEntry.findOne({
          referenceId: order._id,
          referenceModel: 'Order',
          type: 'order'
        });
        
        if (!existingEntry) {
          const ledgerEntry = new LedgerEntry({
            customerId: order.customerId,
            entryDate: new Date(),
            description: `Order delivered: ${order.orderNumber || order.billNumber || 'Order'}`,
            type: 'order',
            amount: order.netAmount,
            reference: order.orderNumber || order.billNumber || order._id.toString(),
            referenceId: order._id,
            referenceModel: 'Order',
            createdBy: order.createdBy || req.user._id
          });
          await ledgerEntry.save();
          console.log('Ledger entry created for delivered order:', ledgerEntry._id);
          
          // Update customer outstanding amount
          const customer = await Customer.findById(order.customerId);
          if (customer) {
            customer.outstandingAmount += order.netAmount;
            await customer.save();
            console.log('Customer outstanding amount updated:', customer.outstandingAmount);
          }
        }
      } catch (error) {
        console.error('Failed to create ledger entry for delivered order:', error);
        // Don't fail the order status update if ledger entry creation fails
      }
    }
    
    // If order was previously delivered and is now changed to something else, 
    // we need to reverse the ledger entry
    if (previousStatus === 'delivered' && status !== 'delivered' && order.customerId) {
      try {
        const LedgerEntry = require('../models/LedgerEntry');
        const Customer = require('../models/Customer');
        
        // Find and delete the ledger entry for this order
        const ledgerEntry = await LedgerEntry.findOne({
          referenceId: order._id,
          referenceModel: 'Order',
          type: 'order'
        });
        
        if (ledgerEntry) {
          await LedgerEntry.findByIdAndDelete(ledgerEntry._id);
          console.log('Ledger entry removed for order status change:', ledgerEntry._id);
          
          // Update customer outstanding amount
          const customer = await Customer.findById(order.customerId);
          if (customer) {
            customer.outstandingAmount = Math.max(0, customer.outstandingAmount - order.netAmount);
            await customer.save();
            console.log('Customer outstanding amount reversed:', customer.outstandingAmount);
          }
        }
      } catch (error) {
        console.error('Failed to reverse ledger entry for order status change:', error);
      }
    }
    
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// TODO: Add more order routes here

module.exports = router; 