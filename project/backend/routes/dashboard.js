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

    // Financial data
    const totalSales = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$netAmount' } } }
    ]);

    const totalCollections = await Collection.aggregate([
      { $match: { status: 'cleared' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalOutstanding = await Customer.aggregate([
      { $group: { _id: null, total: { $sum: '$outstandingAmount' } } }
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

    // Top customers by outstanding
    const topCustomers = await Customer.find()
      .populate('userId', 'name mobile')
      .sort({ outstandingAmount: -1 })
      .limit(5);

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
    const salesman = await Salesman.findOne({ userId: req.user._id });
    if (!salesman) {
      return res.status(404).json({
        success: false,
        message: 'Salesman profile not found'
      });
    }

    // Get salesman's orders
    const totalOrders = await Order.countDocuments({ salesmanId: salesman._id });
    const pendingOrders = await Order.countDocuments({ 
      salesmanId: salesman._id, 
      status: 'pending' 
    });

    // Get salesman's collections
    const totalCollections = await Collection.countDocuments({ 
      salesmanId: salesman._id,
      status: 'cleared'
    });

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

    res.json({
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
          todayCollections: todayCollections[0]?.total || 0
        },
        monthly: {
          orders: monthlyOrders,
          collections: monthlyCollections[0]?.total || 0
        },
        recentOrders
      }
    });
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
          outstandingAmount: customer.outstandingAmount,
          availableCredit: customer.creditLimit - customer.outstandingAmount,
          utilizationPercentage: customer.creditLimit > 0 ? 
            (customer.outstandingAmount / customer.creditLimit) * 100 : 0
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