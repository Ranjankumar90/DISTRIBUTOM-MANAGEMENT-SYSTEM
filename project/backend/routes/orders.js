const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// GET /api/orders - fetch all orders
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// TODO: Add more order routes here

module.exports = router; 