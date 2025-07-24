const express = require('express');
const router = express.Router();
const Visit = require('../models/Visit');

// GET /api/visits - fetch all visits
router.get('/', async (req, res) => {
  try {
    const visits = await Visit.find()
      .populate('customerId', 'userId address')
      .populate('salesmanId', 'userId')
      .sort({ date: -1, time: -1 });
    res.json({ success: true, data: visits });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/visits - create a new visit
router.post('/', async (req, res) => {
  try {
    const visit = new Visit({
      ...req.body,
      createdBy: req.user?._id || req.body.createdBy // fallback for testing
    });
    await visit.save();
    await visit.populate('customerId', 'userId address');
    await visit.populate('salesmanId', 'userId');
    res.status(201).json({ success: true, data: visit });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// PUT /api/visits/:id - update a visit (status or notes)
router.put('/:id', async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id);
    if (!visit) {
      return res.status(404).json({ success: false, message: 'Visit not found' });
    }
    Object.assign(visit, req.body);
    await visit.save();
    await visit.populate('customerId', 'userId address');
    await visit.populate('salesmanId', 'userId');
    res.json({ success: true, data: visit });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// DELETE /api/visits/:id - delete a visit
router.delete('/:id', async (req, res) => {
  try {
    const visit = await Visit.findByIdAndDelete(req.params.id);
    if (!visit) {
      return res.status(404).json({ success: false, message: 'Visit not found' });
    }
    res.json({ success: true, message: 'Visit deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router; 