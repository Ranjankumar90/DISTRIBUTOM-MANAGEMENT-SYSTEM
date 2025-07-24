const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  salesmanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Salesman',
    required: true
  },
  date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  purpose: {
    type: String,
    enum: ['order', 'collection', 'follow_up', 'new_customer'],
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['planned', 'completed', 'missed'],
    default: 'planned'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Visit', visitSchema); 