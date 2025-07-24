const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  gstNumber: {
    type: String,
    trim: true,
    uppercase: true,
    match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Please enter a valid GST number'],
    required: false
  },
  creditLimit: {
    type: Number,
    default: 0,
    min: [0, 'Credit limit cannot be negative']
  },
  outstandingAmount: {
    type: Number,
    default: 0
  },
  territory: {
    type: String,
    trim: true,
    required: false
  },
  customerType: {
    type: String,
    enum: ['retail', 'wholesale', 'distributor'],
    default: 'retail'
  },
  paymentTerms: {
    type: Number,
    default: 30,
    min: [0, 'Payment terms cannot be negative']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 📈 Indexes for query optimization
customerSchema.index({ userId: 1 });
customerSchema.index({ gstNumber: 1 });
customerSchema.index({ territory: 1 });
customerSchema.index({ customerType: 1 });

// 📊 Virtual field: Available credit
customerSchema.virtual('availableCredit').get(function () {
  return this.creditLimit - this.outstandingAmount;
});

// 🔁 Auto-populate user info on find
customerSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'userId',
    select: 'name mobile isActive createdAt'
  });
  next();
});

module.exports = mongoose.model('Customer', customerSchema);
