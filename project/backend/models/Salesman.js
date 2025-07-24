const mongoose = require('mongoose');

const salesmanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  territory: {
    type: String,
    required: [true, 'Territory is required'],
    trim: true,
    maxlength: [100, 'Territory cannot exceed 100 characters']
  },
  targetAmount: {
    type: Number,
    default: 0,
    min: [0, 'Target amount cannot be negative']
  },
  achievedAmount: {
    type: Number,
    default: 0,
    min: [0, 'Achieved amount cannot be negative']
  },
  commissionRate: {
    type: Number,
    default: 0,
    min: [0, 'Commission rate cannot be negative'],
    max: [100, 'Commission rate cannot exceed 100%']
  },
  joiningDate: {
    type: Date,
    default: Date.now
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ✅ Indexes for efficient querying
salesmanSchema.index({ userId: 1 });
salesmanSchema.index({ territory: 1 });
salesmanSchema.index({ manager: 1 });

// ✅ Virtual for achievement percentage
salesmanSchema.virtual('achievementPercentage').get(function() {
  if (this.targetAmount === 0) return 0;
  return (this.achievedAmount / this.targetAmount) * 100;
});

// ✅ Auto-populate user data on all find queries
salesmanSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'userId',
    select: 'name mobile isActive createdAt'
  });
  next();
});

module.exports = mongoose.model('Salesman', salesmanSchema);
