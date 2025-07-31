const express = require('express');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Salesman = require('../models/Salesman');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Collection = require('../models/Collection');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/dashboard/admin
// @desc    Get admin dashboard data
// @access  Private (Admin)
router.get('/admin', auth, authorize('admin'), async (req, res) => {
  try {
    // Auto-sync ledger with orders and collections
    const LedgerEntry = require('../models/LedgerEntry');
    const Collection = require('../models/Collection');
    try {
      await LedgerEntry.syncWithOrders();
      await LedgerEntry.syncWithCollections();
      
      // Additional sync for approved collections that might not have ledger entries
      const customers = await Customer.find();
      let createdEntries = 0;
      
      for (const customer of customers) {
        // Get all approved collections for this customer that don't have ledger entries
        const approvedCollections = await Collection.find({ 
          customerId: customer._id, 
          status: { $in: ['approved', 'cleared'] } 
        });
        
        for (const collection of approvedCollections) {
          // Check if ledger entry already exists for this collection
          const existingEntry = await LedgerEntry.findOne({
            referenceId: collection._id,
            referenceModel: 'Collection',
            type: 'payment'
          });
          
          if (!existingEntry) {
            // Create ledger entry for approved collection
            const ledgerEntry = new LedgerEntry({
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
            console.log(`Auto-created ledger entry for approved collection ${collection._id}`);
          }
        }
      }
      
      if (createdEntries > 0) {
        console.log(`Auto-sync completed: Created ${createdEntries} ledger entries for approved collections`);
      }
      
      console.log('Ledger auto-sync completed');
    } catch (syncError) {
      console.error('Ledger auto-sync error:', syncError);
      // Continue with dashboard data even if sync fails
    }

    // Get counts
    const totalCustomers = await Customer.countDocuments();
    const activeCustomers = await Customer.countDocuments({
      userId: { $in: await User.find({ isActive: true }).distinct('_id') }
    });
    
    const totalSalesmen = await Salesman.countDocuments();
    const activeSalesmen = await Salesman.countDocuments({
      userId: { $in: await User.find({ isActive: true }).distinct('_id') }
    });
    
    const totalProducts = await Product.countDocuments({ isActive: true });
    const lowStockProducts = await Product.countDocuments({
      isActive: true,
      $expr: { $lte: ['$stock', '$minStockLevel'] }
    });

    // Order statistics
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const confirmedOrders = await Order.countDocuments({ status: 'confirmed' });
    const deliveredOrders = await Order.countDocuments({ status: 'delivered' });

    // Financial data - calculate from ledger entries
    const totalSales = await LedgerEntry.aggregate([
      { $match: { type: 'order' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalCollections = await LedgerEntry.aggregate([
      { $match: { type: 'payment' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Calculate outstanding from ledger entries
    const totalOutstanding = await LedgerEntry.aggregate([
      {
        $group: {
          _id: '$customerId',
          totalDebits: {
            $sum: {
              $cond: [
                { $in: ['$type', ['debit', 'order']] },
                '$amount',
                0
              ]
            }
          },
          totalCredits: {
            $sum: {
              $cond: [
                { $in: ['$type', ['credit', 'payment']] },
                '$amount',
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          outstanding: { $subtract: ['$totalDebits', '$totalCredits'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $max: ['$outstanding', 0] } }
        }
      }
    ]);

    // Recent orders
    const recentOrders = await Order.find()
      .populate([
        {
          path: 'customerId',
          populate: { path: 'userId', select: 'name' }
        }
      ])
      .sort({ createdAt: -1 })
      .limit(5);

    // Top customers by outstanding - calculate from ledger
    const topCustomersData = await LedgerEntry.aggregate([
      {
        $group: {
          _id: '$customerId',
          totalDebits: {
            $sum: {
              $cond: [
                { $in: ['$type', ['debit', 'order']] },
                '$amount',
                0
              ]
            }
          },
          totalCredits: {
            $sum: {
              $cond: [
                { $in: ['$type', ['credit', 'payment']] },
                '$amount',
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          outstandingAmount: { $subtract: ['$totalDebits', '$totalCredits'] }
        }
      },
      {
        $match: { outstandingAmount: { $gt: 0 } }
      },
      {
        $sort: { outstandingAmount: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // Get customer details for top customers
    const topCustomers = await Customer.find({
      _id: { $in: topCustomersData.map(c => c._id) }
    })
    .populate('userId', 'name mobile')
    .then(customers => {
      return customers.map(customer => {
        const ledgerData = topCustomersData.find(d => d._id.toString() === customer._id.toString());
        return {
          ...customer.toObject(),
          outstandingAmount: ledgerData ? ledgerData.outstandingAmount : 0
        };
      });
    });

    // Monthly sales data (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlySales = await Order.aggregate([
      {
        $match: {
          orderDate: { $gte: sixMonthsAgo },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$orderDate' },
            month: { $month: '$orderDate' }
          },
          totalSales: { $sum: '$netAmount' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          customers: { total: totalCustomers, active: activeCustomers },
          salesmen: { total: totalSalesmen, active: activeSalesmen },
          products: { total: totalProducts, lowStock: lowStockProducts },
          orders: { total: totalOrders, pending: pendingOrders, confirmed: confirmedOrders, delivered: deliveredOrders }
        },
        financial: {
          totalSales: totalSales[0]?.total || 0,
          totalCollections: totalCollections[0]?.total || 0,
          totalOutstanding: totalOutstanding[0]?.total || 0
        },
        recentOrders,
        topCustomers,
        monthlySales
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/dashboard/salesman
// @desc    Get salesman dashboard data
// @access  Private (Salesman)
router.get('/salesman', auth, authorize('salesman'), async (req, res) => {
  try {
    console.log('Salesman dashboard request - User ID:', req.user._id);
    const salesman = await Salesman.findOne({ userId: req.user._id });
    console.log('Found salesman:', salesman);
    if (!salesman) {
      return res.status(404).json({
        success: false,
        message: 'Salesman profile not found'
      });
    }

    // Auto-sync ledger with orders and collections for salesman's territory
    const LedgerEntry = require('../models/LedgerEntry');
    const Collection = require('../models/Collection');
    try {
      await LedgerEntry.syncWithOrders();
      await LedgerEntry.syncWithCollections();
      
      // Additional sync for approved collections that might not have ledger entries
      const territoryCustomers = await Customer.find({ territory: salesman.territory });
      let createdEntries = 0;
      
      for (const customer of territoryCustomers) {
        const approvedCollections = await Collection.find({ 
          customerId: customer._id, 
          status: { $in: ['approved', 'cleared'] } 
        });
        
        for (const collection of approvedCollections) {
          // Check if ledger entry already exists for this collection
          const existingEntry = await LedgerEntry.findOne({
            referenceId: collection._id,
            referenceModel: 'Collection',
            type: 'payment'
          });
          
          if (!existingEntry) {
            // Create ledger entry for approved collection
            const ledgerEntry = new LedgerEntry({
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
            console.log(`Auto-created ledger entry for salesman territory approved collection ${collection._id}`);
          }
        }
      }
      
      if (createdEntries > 0) {
        console.log(`Salesman auto-sync completed: Created ${createdEntries} ledger entries for approved collections`);
      }
      
      console.log('Ledger auto-sync completed for salesman');
    } catch (syncError) {
      console.error('Ledger auto-sync error:', syncError);
      // Continue with dashboard data even if sync fails
    }

    // Get salesman's orders
    const totalOrders = await Order.countDocuments({ salesmanId: salesman._id });
    const pendingOrders = await Order.countDocuments({ 
      salesmanId: salesman._id, 
      status: 'pending' 
    });
    console.log('Salesman orders - Total:', totalOrders, 'Pending:', pendingOrders);

    // Get salesman's collections
    const totalCollections = await Collection.countDocuments({ 
      salesmanId: salesman._id,
      status: 'cleared'
    });
    console.log('Salesman collections - Total:', totalCollections);

    const todayCollections = await Collection.aggregate([
      {
        $match: {
          salesmanId: salesman._id,
          status: 'cleared',
          collectionDate: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
            $lt: new Date(new Date().setHours(23, 59, 59, 999))
          }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Get territory customers
    const territoryCustomers = await Customer.countDocuments({
      territory: salesman.territory
    });
    console.log('Territory customers:', territoryCustomers, 'Territory:', salesman.territory);

    // Calculate outstanding amounts for salesman's territory customers from ledger
    const territoryOutstandingData = await LedgerEntry.aggregate([
      {
        $lookup: {
          from: 'customers',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customer'
        }
      },
      {
        $match: {
          'customer.territory': salesman.territory
        }
      },
      {
        $group: {
          _id: '$customerId',
          totalDebits: {
            $sum: {
              $cond: [
                { $in: ['$type', ['debit', 'order']] },
                '$amount',
                0
              ]
            }
          },
          totalCredits: {
            $sum: {
              $cond: [
                { $in: ['$type', ['credit', 'payment']] },
                '$amount',
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          outstandingAmount: { $subtract: ['$totalDebits', '$totalCredits'] }
        }
      },
      {
        $match: { outstandingAmount: { $gt: 0 } }
      },
      {
        $group: {
          _id: null,
          totalOutstanding: { $sum: '$outstandingAmount' },
          customerCount: { $sum: 1 }
        }
      }
    ]);

    // Get customers with outstanding amounts for salesman's territory
    const customersWithOutstanding = await Customer.aggregate([
      {
        $match: { territory: salesman.territory }
      },
      {
        $lookup: {
          from: 'ledgerentries',
          localField: '_id',
          foreignField: 'customerId',
          as: 'ledgerEntries'
        }
      },
      {
        $addFields: {
          totalDebits: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$ledgerEntries',
                    cond: { $in: ['$$this.type', ['debit', 'order']] }
                  }
                },
                as: 'entry',
                in: '$$entry.amount'
              }
            }
          },
          totalCredits: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$ledgerEntries',
                    cond: { $in: ['$$this.type', ['credit', 'payment']] }
                  }
                },
                as: 'entry',
                in: '$$entry.amount'
              }
            }
          }
        }
      },
      {
        $addFields: {
          outstandingAmount: { $subtract: ['$totalDebits', '$totalCredits'] }
        }
      },
      {
        $match: { outstandingAmount: { $gt: 0 } }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          _id: 1,
          'user.name': 1,
          'user.mobile': 1,
          outstandingAmount: 1
        }
      },
      {
        $sort: { outstandingAmount: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // Recent orders
    const recentOrders = await Order.find({ salesmanId: salesman._id })
      .populate([
        {
          path: 'customerId',
          populate: { path: 'userId', select: 'name' }
        }
      ])
      .sort({ createdAt: -1 })
      .limit(5);

    // Monthly performance
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const monthlyOrders = await Order.countDocuments({
      salesmanId: salesman._id,
      orderDate: { $gte: currentMonth },
      status: { $ne: 'cancelled' }
    });

    const monthlyCollections = await Collection.aggregate([
      {
        $match: {
          salesmanId: salesman._id,
          status: 'cleared',
          collectionDate: { $gte: currentMonth }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const responseData = {
      success: true,
      data: {
        profile: {
          name: req.user.name,
          territory: salesman.territory,
          targetAmount: salesman.targetAmount,
          achievedAmount: salesman.achievedAmount,
          achievementPercentage: salesman.targetAmount > 0 ? 
            (salesman.achievedAmount / salesman.targetAmount) * 100 : 0
        },
        overview: {
          totalOrders,
          pendingOrders,
          totalCollections,
          territoryCustomers,
          todayCollections: todayCollections[0]?.total || 0,
          totalOutstanding: territoryOutstandingData[0]?.totalOutstanding || 0,
          customersWithOutstanding: territoryOutstandingData[0]?.customerCount || 0
        },
        monthly: {
          orders: monthlyOrders,
          collections: monthlyCollections[0]?.total || 0
        },
        recentOrders,
        customersWithOutstanding
      }
    };
    console.log('Salesman dashboard response data:', responseData);
    res.json(responseData);
  } catch (error) {
    console.error('Salesman dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/dashboard/customer
// @desc    Get customer dashboard data
// @access  Private (Customer)
router.get('/customer', auth, authorize('customer'), async (req, res) => {
  try {
    const customer = await Customer.findOne({ userId: req.user._id })
      .populate('userId', 'name mobile');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer profile not found'
      });
    }

    // Auto-sync ledger with orders and collections for this customer
    const LedgerEntry = require('../models/LedgerEntry');
    const Collection = require('../models/Collection');
    try {
      await LedgerEntry.syncWithOrders();
      await LedgerEntry.syncWithCollections();
      
      // Additional sync for approved collections that might not have ledger entries
      const approvedCollections = await Collection.find({ 
        customerId: customer._id, 
        status: { $in: ['approved', 'cleared'] } 
      });
      
      let createdEntries = 0;
      for (const collection of approvedCollections) {
        // Check if ledger entry already exists for this collection
        const existingEntry = await LedgerEntry.findOne({
          referenceId: collection._id,
          referenceModel: 'Collection',
          type: 'payment'
        });
        
        if (!existingEntry) {
          // Create ledger entry for approved collection
          const ledgerEntry = new LedgerEntry({
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
          console.log(`Auto-created ledger entry for customer approved collection ${collection._id}`);
        }
      }
      
      if (createdEntries > 0) {
        console.log(`Customer auto-sync completed: Created ${createdEntries} ledger entries for approved collections`);
      }
      
      console.log('Ledger auto-sync completed for customer');
    } catch (syncError) {
      console.error('Ledger auto-sync error:', syncError);
      // Continue with dashboard data even if sync fails
    }

    // Get customer's orders
    const totalOrders = await Order.countDocuments({ customerId: customer._id });
    const pendingOrders = await Order.countDocuments({ 
      customerId: customer._id, 
      status: 'pending' 
    });
    const deliveredOrders = await Order.countDocuments({ 
      customerId: customer._id, 
      status: 'delivered' 
    });

    // Calculate outstanding amount from ledger entries
    const outstandingData = await LedgerEntry.aggregate([
      { $match: { customerId: customer._id } },
      {
        $group: {
          _id: null,
          totalDebits: {
            $sum: {
              $cond: [
                { $in: ['$type', ['debit', 'order']] },
                '$amount',
                0
              ]
            }
          },
          totalCredits: {
            $sum: {
              $cond: [
                { $in: ['$type', ['credit', 'payment']] },
                '$amount',
                0
              ]
            }
          }
        }
      }
    ]);

    const outstandingAmount = outstandingData[0] ? 
      Math.max(0, outstandingData[0].totalDebits - outstandingData[0].totalCredits) : 0;

    // Recent orders
    const recentOrders = await Order.find({ customerId: customer._id })
      .populate('items.productId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    // Order value statistics
    const orderStats = await Order.aggregate([
      { $match: { customerId: customer._id, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: null,
          totalValue: { $sum: '$netAmount' },
          averageValue: { $avg: '$netAmount' },
          maxValue: { $max: '$netAmount' }
        }
      }
    ]);

    // Monthly order data (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyOrders = await Order.aggregate([
      {
        $match: {
          customerId: customer._id,
          orderDate: { $gte: sixMonthsAgo },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$orderDate' },
            month: { $month: '$orderDate' }
          },
          totalValue: { $sum: '$netAmount' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        profile: {
          name: customer.userId.name,
          mobile: customer.userId.mobile,
          creditLimit: customer.creditLimit,
          outstandingAmount: outstandingAmount,
          availableCredit: customer.creditLimit - outstandingAmount,
          utilizationPercentage: customer.creditLimit > 0 ? 
            (outstandingAmount / customer.creditLimit) * 100 : 0
        },
        overview: {
          totalOrders,
          pendingOrders,
          deliveredOrders,
          totalValue: orderStats[0]?.totalValue || 0,
          averageOrderValue: orderStats[0]?.averageValue || 0
        },
        recentOrders,
        monthlyOrders
      }
    });
  } catch (error) {
    console.error('Customer dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;