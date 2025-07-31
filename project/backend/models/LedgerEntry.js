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

// 📊 Pre-save hook to update customer outstanding amount
ledgerEntrySchema.pre('save', async function(next) {
  try {
    const Customer = require('./Customer');
    const customer = await Customer.findById(this.customerId);
    
    if (!customer) {
      return next(new Error('Customer not found'));
    }

    // If this is a new document, update customer outstanding amount
    if (this.isNew) {
      switch (this.type) {
        case 'debit':
        case 'order':
          customer.outstandingAmount += this.amount;
          break;
        case 'credit':
        case 'payment':
          customer.outstandingAmount = Math.max(0, customer.outstandingAmount - this.amount);
          break;
        case 'adjustment':
          customer.outstandingAmount += this.amount; // adjustment can be +/- based on context
          break;
        case 'opening_balance':
          customer.outstandingAmount = this.amount; // overrides previous
          break;
      }
      await customer.save();
    } else {
      // If this is an update, we need to handle the difference
      // This is more complex and would require tracking the old amount
      // For now, we'll recalculate the entire outstanding amount
      const totalOrder = await this.constructor.aggregate([
        { $match: { customerId: this.customerId, type: { $in: ['debit', 'order'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      
      const totalPayment = await this.constructor.aggregate([
        { $match: { customerId: this.customerId, type: { $in: ['credit', 'payment'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      
      customer.outstandingAmount = Math.max(0, (totalOrder[0]?.total || 0) - (totalPayment[0]?.total || 0));
      await customer.save();
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// 📊 Pre-remove hook to update customer outstanding amount when ledger entry is deleted
ledgerEntrySchema.pre('remove', async function(next) {
  try {
    const Customer = require('./Customer');
    const customer = await Customer.findById(this.customerId);
    
    if (!customer) {
      return next(new Error('Customer not found'));
    }

    // Reverse the effect of this ledger entry
    switch (this.type) {
      case 'debit':
      case 'order':
        customer.outstandingAmount = Math.max(0, customer.outstandingAmount - this.amount);
        break;
      case 'credit':
      case 'payment':
        customer.outstandingAmount += this.amount;
        break;
      case 'adjustment':
        customer.outstandingAmount = Math.max(0, customer.outstandingAmount - this.amount); // reverse adjustment
        break;
      case 'opening_balance':
        // For opening balance, we need to recalculate from other entries
        const totalOrder = await this.constructor.aggregate([
          { $match: { customerId: this.customerId, type: { $in: ['debit', 'order'] } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        
        const totalPayment = await this.constructor.aggregate([
          { $match: { customerId: this.customerId, type: { $in: ['credit', 'payment'] } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        
        customer.outstandingAmount = Math.max(0, (totalOrder[0]?.total || 0) - (totalPayment[0]?.total || 0));
        break;
    }
    
    await customer.save();
    next();
  } catch (error) {
    next(error);
  }
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

// 📊 Static method to recalculate running balances for all entries
ledgerEntrySchema.statics.recalculateRunningBalances = async function() {
  try {
    const customers = await require('./Customer').find();
    
    for (const customer of customers) {
      // Get all entries for this customer, sorted by date
      const entries = await this.find({ customerId: customer._id })
        .sort({ entryDate: 1, createdAt: 1 });
      
      let runningBalance = 0;
      
      // Update each entry with its running balance
      for (const entry of entries) {
        if (entry.type === 'debit' || entry.type === 'order') {
          runningBalance += entry.amount;
        } else if (entry.type === 'credit' || entry.type === 'payment') {
          runningBalance -= entry.amount;
        } else if (entry.type === 'adjustment') {
          runningBalance += entry.amount; // adjustment can be +/- based on context
        } else if (entry.type === 'opening_balance') {
          runningBalance = entry.amount; // overrides previous
        }
        
        entry.runningBalance = runningBalance;
        await entry.save();
      }
    }
    
    return { success: true, message: 'Running balances recalculated for all entries' };
  } catch (error) {
    throw new Error('Failed to recalculate running balances: ' + error.message);
  }
};

// 📊 Static method to automatically sync ledger with orders
ledgerEntrySchema.statics.syncWithOrders = async function() {
  try {
    const Order = require('./Order');
    const customers = await require('./Customer').find();
    let createdEntries = 0;
    let deletedEntries = 0;
    
    for (const customer of customers) {
      // Get all delivered orders for this customer
      const deliveredOrders = await Order.find({ customerId: customer._id, status: 'delivered' });
      
      for (const order of deliveredOrders) {
        // Check if ledger entry already exists for this order
        const existingEntry = await this.findOne({
          referenceId: order._id,
          referenceModel: 'Order',
          type: 'order'
        });
        
        if (!existingEntry) {
          // Create ledger entry for delivered order
          const ledgerEntry = new this({
            customerId: customer._id,
            entryDate: order.deliveryDate || order.orderDate || new Date(),
            description: `Order delivered: ${order.orderNumber || order.billNumber || 'Order'}`,
            type: 'order',
            amount: order.netAmount,
            reference: order.orderNumber || order.billNumber || order._id.toString(),
            referenceId: order._id,
            referenceModel: 'Order',
            createdBy: order.createdBy
          });
          await ledgerEntry.save();
          createdEntries++;
        }
      }
      
      // Remove ledger entries for orders that are no longer delivered
      const nonDeliveredOrders = await Order.find({ 
        customerId: customer._id, 
        status: { $ne: 'delivered' } 
      });
      
      for (const order of nonDeliveredOrders) {
        const existingEntry = await this.findOne({
          referenceId: order._id,
          referenceModel: 'Order',
          type: 'order'
        });
        
        if (existingEntry) {
          await this.findByIdAndDelete(existingEntry._id);
          deletedEntries++;
        }
      }
    }
    
    return { success: true, createdEntries, deletedEntries };
  } catch (error) {
    throw new Error('Failed to sync ledger with orders: ' + error.message);
  }
};

// 📊 Static method to automatically sync ledger with collections
ledgerEntrySchema.statics.syncWithCollections = async function() {
  try {
    const Collection = require('./Collection');
    const customers = await require('./Customer').find();
    let createdEntries = 0;
    let deletedEntries = 0;
    
    for (const customer of customers) {
      // Get all approved and cleared collections for this customer
      const approvedCollections = await Collection.find({ 
        customerId: customer._id, 
        status: { $in: ['approved', 'cleared'] } 
      });
      
      for (const collection of approvedCollections) {
        // Check if ledger entry already exists for this collection
        const existingEntry = await this.findOne({
          referenceId: collection._id,
          referenceModel: 'Collection',
          type: 'payment'
        });
        
        if (!existingEntry) {
          // Create ledger entry for approved/cleared collection
          const ledgerEntry = new this({
            customerId: customer._id,
            entryDate: collection.collectionDate || new Date(),
            description: `Payment received: ${collection.paymentMode || 'Collection'} - ${collection.collectionNumber || collection._id.toString()}`,
            type: 'payment',
            amount: collection.amount,
            reference: collection.collectionNumber || collection._id.toString(),
            referenceId: collection._id,
            referenceModel: 'Collection',
            createdBy: collection.createdBy
          });
          await ledgerEntry.save();
          createdEntries++;
        }
      }
      
      // Remove ledger entries for collections that are no longer approved or cleared
      const nonApprovedCollections = await Collection.find({ 
        customerId: customer._id, 
        status: { $nin: ['approved', 'cleared'] } 
      });
      
      for (const collection of nonApprovedCollections) {
        const existingEntry = await this.findOne({
          referenceId: collection._id,
          referenceModel: 'Collection',
          type: 'payment'
        });
        
        if (existingEntry) {
          await this.findByIdAndDelete(existingEntry._id);
          deletedEntries++;
        }
      }
    }
    
    return { success: true, createdEntries, deletedEntries };
  } catch (error) {
    throw new Error('Failed to sync ledger with collections: ' + error.message);
  }
};



module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);
