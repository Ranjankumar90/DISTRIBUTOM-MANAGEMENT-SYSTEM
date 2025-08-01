import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Users, ShoppingCart, DollarSign, Target, TrendingUp, MapPin, Calendar, Phone, Package } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { dashboardAPI, ordersAPI, customersAPI, collectionsAPI, salesmenAPI } from '../../services/api';
import { lazy, Suspense } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';

// Lazy load components for better performance
const TakeOrder = lazy(() => import('./TakeOrder'));
const CollectPayment = lazy(() => import('./CollectPayment'));
const CustomerVisits = lazy(() => import('./CustomerVisits'));
const SalesReport = lazy(() => import('./SalesReport'));
const SalesmanProductManagement = lazy(() => import('./SalesmanProductManagement'));
const SalesmanLedger = lazy(() => import('./SalesmanLedger'));

const SalesmanDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboard, setDashboard] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [salesmen, setSalesmen] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Set a timeout for the dashboard request
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Dashboard load timeout. Please try again.')), 10000) // Reduced to 10 seconds
      );
      
      // Load dashboard data first (most important)
      const dashboardPromise = dashboardAPI.getSalesmanDashboard();
      const dashboardRes = await Promise.race([dashboardPromise, timeoutPromise]) as any;
      
      if (dashboardRes.success) {
        setDashboard(dashboardRes.data);
        setRetryCount(0); // Reset retry count on success
      } else {
        setError(dashboardRes.message || 'Failed to load dashboard');
        return;
      }

      // Load additional data in parallel with optimized queries
      const [orderRes, customerRes, collectionRes, salesmenRes] = await Promise.all([
        ordersAPI.getAll({ limit: 50 }), // Limit recent orders
        customersAPI.getAll({ limit: 100 }), // Limit customers
        collectionsAPI.getAll({ limit: 50 }), // Limit recent collections
        salesmenAPI.getAll()
      ]);
      
      setOrders(orderRes.data || []);
      setCustomers(customerRes.data || []);
      setCollections(collectionRes.data || []);
      setSalesmen(salesmenRes.data || []);
    } catch (err: any) {
      console.error('Dashboard loading error:', err);
      setError(err.message || 'Failed to load dashboard');
      
      // Auto-retry on network errors (max 2 attempts, reduced from 3)
      if (err.message.includes('Network error') || err.message.includes('timeout') && retryCount < 2) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          loadDashboardData();
        }, 1000); // Reduced retry delay to 1 second
      }
    } finally {
      setLoading(false);
    }
  }, [retryCount]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Auto-refresh when tab changes (but not for overview to avoid double loading)
  useEffect(() => {
    if (activeTab !== 'overview') {
      const timeoutId = setTimeout(() => {
        loadDashboardData();
      }, 100); // Small delay to prevent excessive calls
      
      return () => clearTimeout(timeoutId);
    }
  }, [activeTab, loadDashboardData]);
  
  // Memoized calculations for better performance
  const salesman = useMemo(() => 
    salesmen.find(s => s.userId?._id === user?._id), 
    [salesmen, user?._id]
  );

  const salesmanOrders = useMemo(() => 
    orders.filter(o => {
      const orderSalesmanId = typeof o.salesmanId === 'string' ? o.salesmanId : o.salesmanId?._id;
      return orderSalesmanId === salesman?._id;
    }), 
    [orders, salesman?._id]
  );

  const salesmanCollections = useMemo(() => 
    collections.filter(c => {
      const collectionSalesmanId = typeof c.salesmanId === 'string' ? c.salesmanId : c.salesmanId?._id;
      return collectionSalesmanId === salesman?._id;
    }), 
    [collections, salesman?._id]
  );

  // Calculate stats from frontend data as fallback
  const currentMonth = useMemo(() => {
    const month = new Date();
    month.setDate(1);
    month.setHours(0, 0, 0, 0);
    return month;
  }, []);

  const monthlyOrders = useMemo(() => 
    salesmanOrders.filter(o => new Date(o.orderDate) >= currentMonth).length, 
    [salesmanOrders, currentMonth]
  );

  const todayCollectionsFiltered = useMemo(() => 
    salesmanCollections.filter(c => 
      c.collectionDate === new Date().toISOString().split('T')[0]
    ), 
    [salesmanCollections]
  );

  const todayCollectionsAmount = useMemo(() => 
    todayCollectionsFiltered.reduce((sum, c) => sum + (c.amount || 0), 0), 
    [todayCollectionsFiltered]
  );
  
  const stats = useMemo(() => [
    {
      title: 'Territory Customers',
      value: dashboard?.overview?.territoryCustomers || customers.filter(c => c.territory === salesman?.territory).length || 0,
      icon: Users,
      color: 'bg-green-500'
    },
    {
      title: 'Orders This Month',
      value: dashboard?.monthly?.orders || monthlyOrders || 0,
      icon: ShoppingCart,
      color: 'bg-blue-500'
    },
    {
      title: 'Collections Today',
      value: `₹${(dashboard?.overview?.todayCollections || todayCollectionsAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'bg-purple-500'
    },
    {
      title: 'Territory Outstanding',
      value: `₹${(dashboard?.overview?.totalOutstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Target,
      color: 'bg-red-500'
    }
  ], [dashboard, customers, salesman?.territory, monthlyOrders, todayCollectionsAmount]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'take-order', label: 'Take Order', icon: ShoppingCart },
    { id: 'collect-payment', label: 'Collect Payment', icon: DollarSign },
    { id: 'products', label: 'Product Management', icon: Package },
    { id: 'customer-visits', label: 'Customer Visits', icon: MapPin },
    { id: 'sales-report', label: 'Sales Report', icon: Calendar },
    { id: 'ledger', label: 'Customer Ledger', icon: DollarSign },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'take-order':
        return (
          <Suspense fallback={<LoadingSpinner size="md" text="Loading take order..." />}>
            <TakeOrder />
          </Suspense>
        );
      case 'collect-payment':
        return (
          <Suspense fallback={<LoadingSpinner size="md" text="Loading collect payment..." />}>
            <CollectPayment />
          </Suspense>
        );
      case 'customer-visits':
        return (
          <Suspense fallback={<LoadingSpinner size="md" text="Loading customer visits..." />}>
            <CustomerVisits />
          </Suspense>
        );
      case 'products':
        return (
          <Suspense fallback={<LoadingSpinner size="md" text="Loading product management..." />}>
            <SalesmanProductManagement />
          </Suspense>
        );
      case 'sales-report':
        return (
          <Suspense fallback={<LoadingSpinner size="md" text="Loading sales report..." />}>
            <SalesReport />
          </Suspense>
        );
      case 'ledger':
        return (
          <Suspense fallback={<LoadingSpinner size="md" text="Loading ledger..." />}>
            <SalesmanLedger />
          </Suspense>
        );
      default:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat) => (
                <div key={stat.title} className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                    </div>
                    <div className={`${stat.color} p-3 rounded-lg`}>
                      <stat.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h3>
                <button
                  onClick={loadDashboardData}
                  className="mb-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  Refresh Data
                </button>
                <div className="space-y-3">
                  {dashboard?.recentOrders && dashboard.recentOrders.length > 0 ? (
                    dashboard.recentOrders.map((order: any) => (
                      <div key={order._id} className="flex items-center justify-between py-2 border-b border-gray-100">
                        <div>
                          <p className="font-medium text-gray-900">{order.customerId?.userId?.name || 'Unknown Customer'}</p>
                          <p className="text-sm text-gray-600">{order.orderDate}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">₹{order.netAmount?.toFixed(2) || '0.00'}</p>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-4">No recent orders</div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Territory Information</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{dashboard?.profile?.territory || 'Not assigned'}</p>
                      <p className="text-sm text-gray-600">Territory</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Target className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">₹{dashboard?.profile?.targetAmount || 0}</p>
                      <p className="text-sm text-gray-600">Monthly Target</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">₹{dashboard?.profile?.achievedAmount || 0}</p>
                      <p className="text-sm text-gray-600">Achieved This Month</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>Contact: {salesman?.userId?.mobile || user?.mobile || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Customers with Outstanding</h3>
                <div className="space-y-3">
                  {dashboard?.customersWithOutstanding && dashboard.customersWithOutstanding.length > 0 ? (
                    dashboard.customersWithOutstanding.map((customer: any) => (
                      <div key={customer._id} className="flex items-center justify-between py-2 border-b border-gray-100">
                        <div>
                          <p className="font-medium text-gray-900">{customer.user?.name || 'Unknown Customer'}</p>
                          <p className="text-sm text-gray-600">{customer.user?.mobile || 'No mobile'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-red-600">₹{customer.outstandingAmount?.toFixed(2) || '0.00'}</p>
                          <p className="text-xs text-gray-500">Outstanding</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No outstanding amounts in territory</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Monthly Target Progress</span>
                      <span className="font-medium text-gray-900">
                        {dashboard?.profile?.achievementPercentage?.toFixed(1) || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-green-500 h-3 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min(dashboard?.profile?.achievementPercentage || 0, 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Territory Outstanding</span>
                      <span className="font-medium text-red-600">₹{dashboard?.overview?.totalOutstanding || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Customers with Dues</span>
                      <span className="font-medium text-gray-900">{dashboard?.overview?.customersWithOutstanding || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading salesman dashboard..." fast={true} />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">{error}</div>
          <button 
            onClick={loadDashboardData}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </div>
    </div>
  );
};

export default SalesmanDashboard;