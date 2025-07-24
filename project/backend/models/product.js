const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required']
  },
  sku: {
    type: String,
    unique: true,    // 🚨 This already creates an index!
    sparse: true,
    trim: true
  },
  mrp: {
    type: Number,
    required: [true, 'MRP is required'],
    min: [0, 'MRP cannot be negative']
  },
  saleRate: {
    type: Number,
    required: [true, 'Sale rate is required'],
    min: [0, 'Sale rate cannot be negative']
  },
  gstRate: {
    type: Number,
    required: [true, 'GST rate is required'],
    min: [0, 'GST rate cannot be negative'],
    max: [100, 'GST rate cannot exceed 100%']
  },
  stock: {
    type: Number,
    default: 0,
    min: [0, 'Stock cannot be negative']
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    trim: true,
    maxlength: [50, 'Unit cannot exceed 50 characters']
  },
  minStockLevel: {
    type: Number,
    default: 10,
    min: [0, 'Minimum stock level cannot be negative']
  },
  maxStockLevel: {
    type: Number,
    min: [0, 'Maximum stock level cannot be negative']
  },
  category: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  batchInfo: {
    batchNumber: String,
    manufacturingDate: Date,
    expiryDate: Date
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    weight: Number
  },
  isActive: {
    type: Boolean,
    default: true
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


// ✅ Indexes for efficient querying
productSchema.index({ name: 1 });
productSchema.index({ companyId: 1 });
// ❌ Removed: productSchema.index({ sku: 1 }) — handled by unique:true
productSchema.index({ category: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ stock: 1 });
productSchema.index({ 'batchInfo.expiryDate': 1 });


// 📊 Virtual: Stock Status
productSchema.virtual('stockStatus').get(function() {
  if (this.stock === 0) return 'out-of-stock';
  if (this.stock <= this.minStockLevel) return 'low-stock';
  return 'in-stock';
});

// ⌛ Virtual: Expiry Status
productSchema.virtual('expiryStatus').get(function() {
  if (!this.batchInfo?.expiryDate) return 'no-expiry';

  const today = new Date();
  const expiry = new Date(this.batchInfo.expiryDate);
  const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 30) return 'expiring-soon';
  if (daysUntilExpiry <= 90) return 'expiring-warning';
  return 'good';
});


// 🔁 Auto-populate company on queries
productSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'companyId',
    select: 'name gstNumber'
  });
  next();
});


// 🔧 Pre-save: Auto-generate SKU if missing
productSchema.pre('save', function(next) {
  if (!this.sku && this.isNew) {
    this.sku = `${this.name.substring(0, 3).toUpperCase()}-${Date.now()}`;
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
