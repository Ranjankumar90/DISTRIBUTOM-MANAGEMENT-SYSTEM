const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
  collectionNumber: {
    type: String,
    unique: true,
    required: true,
    default: function() {
      const now = new Date();
      const year = now.getFullYear();
      const ms = now.getTime();
      const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `COL-${year}-${ms}-${rand}`;
    }
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer is required']
  },
  salesmanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Salesman',
    required: [true, 'Salesman is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  paymentMode: {
    type: String,
    enum: ['cash', 'cheque', 'upi', 'bank_transfer', 'card'],
    required: [true, 'Payment mode is required']
  },
  paymentDetails: {
    reference: String,        // Cheque number, UPI ID, etc.
    bankName: String,
    chequeDate: Date,
    clearanceDate: Date
  },
  collectionDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'cleared', 'bounced', 'cancelled', 'failed'],
    default: 'pending'
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 📌 Indexes for performance
collectionSchema.index({ customerId: 1 });
collectionSchema.index({ salesmanId: 1 });
collectionSchema.index({ collectionDate: 1 });
collectionSchema.index({ status: 1 });
collectionSchema.index({ paymentMode: 1 });

// 🧠 Auto-generate collection number before save
collectionSchema.pre('save', async function(next) {
  try {
    if (!this.collectionNumber && this.isNew) {
      // Use timestamp and random 3-digit number for uniqueness
      const now = new Date();
      const year = now.getFullYear();
      const ms = now.getTime();
      const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      this.collectionNumber = `COL-${year}-${ms}-${rand}`;
    }
    next();
  } catch (error) {
    console.error('Collection pre-save error:', error);
    next(error);
  }
});

// 🔗 Auto-populate customer and salesman info
collectionSchema.pre(/^find/, function(next) {
  this.populate([
    {
      path: 'customerId',
      populate: {
        path: 'userId',
        select: 'name mobile'
      }
    },
    {
      path: 'salesmanId',
      populate: {
        path: 'userId',
        select: 'name mobile'
      }
    }
  ]);
  next();
});

module.exports = mongoose.model('Collection', collectionSchema);
