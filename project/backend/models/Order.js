const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  rate: {
    type: Number,
    required: [true, 'Rate is required'],
    min: [0, 'Rate cannot be negative']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  gstAmount: {
    type: Number,
    required: [true, 'GST amount is required'],
    min: [0, 'GST amount cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer is required']
  },
  salesmanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Salesman'
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  gstAmount: {
    type: Number,
    required: [true, 'GST amount is required'],
    min: [0, 'GST amount cannot be negative']
  },
  netAmount: {
    type: Number,
    required: [true, 'Net amount is required'],
    min: [0, 'Net amount cannot be negative']
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: [0, 'Discount amount cannot be negative']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  deliveryDate: Date,
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  billNumber: String,
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customerId: 1 });
orderSchema.index({ salesmanId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ orderDate: 1 });
orderSchema.index({ createdBy: 1 });

// Pre-save middleware to generate order number
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber && this.isNew) {
    const count = await this.constructor.countDocuments();
    this.orderNumber = `ORD-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Populate related data when querying
orderSchema.pre(/^find/, function(next) {
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
    },
    {
      path: 'items.productId',
      select: 'name unit companyId'
    }
  ]);
  next();
});

module.exports = mongoose.model('Order', orderSchema);