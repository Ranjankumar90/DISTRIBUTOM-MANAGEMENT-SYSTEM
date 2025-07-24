const mongoose = require('mongoose');

const ledgerEntrySchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer is required']
  },
  entryDate: {
    type: Date,
    required: [true, 'Entry date is required']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  type: {
    type: String,
    enum: ['debit', 'credit', 'order', 'payment', 'adjustment', 'opening_balance'],
    required: [true, 'Entry type is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  reference: {
    type: String,
    trim: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'referenceModel'
  },
  referenceModel: {
    type: String,
    enum: ['Order', 'Collection', 'User']
  },
  runningBalance: {
    type: Number,
    default: 0
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

// 🔍 Indexes
ledgerEntrySchema.index({ customerId: 1, entryDate: 1 }); // compound for sorting/filtering
ledgerEntrySchema.index({ type: 1 });
ledgerEntrySchema.index({ referenceId: 1 });
// Removed duplicate: ledgerEntrySchema.index({ entryDate: 1 });

// 🔁 Auto-populate customer info
ledgerEntrySchema.pre(/^find/, function(next) {
  this.populate({
    path: 'customerId',
    populate: {
      path: 'userId',
      select: 'name mobile'
    }
  });
  next();
});

// 📊 Static method to calculate running balance
ledgerEntrySchema.statics.calculateRunningBalance = async function(customerId, upToDate = new Date()) {
  const entries = await this.find({
    customerId,
    entryDate: { $lte: upToDate }
  }).sort({ entryDate: 1, createdAt: 1 });

  let balance = 0;
  for (const entry of entries) {
    switch (entry.type) {
      case 'debit':
      case 'order':
        balance += entry.amount;
        break;
      case 'credit':
      case 'payment':
        balance -= entry.amount;
        break;
      case 'adjustment':
        balance += entry.amount; // adjustment can be +/- based on context
        break;
      case 'opening_balance':
        balance = entry.amount; // overrides previous
        break;
    }
  }

  return balance;
};

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);
