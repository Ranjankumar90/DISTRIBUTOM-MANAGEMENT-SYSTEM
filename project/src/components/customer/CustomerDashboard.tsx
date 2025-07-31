import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ShoppingCart, Package, Clock, CheckCircle, TrendingUp, CreditCard, FileText, Phone } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { lazy, Suspense } from 'react';

// Lazy load components for better performance
const PlaceOrder = lazy(() => import('./PlaceOrder'));
const OrderHistory = lazy(() => import('./OrderHistory'));
const AccountStatement = lazy(() => import('./AccountStatement'));
import { customersAPI } from '../../services/api';
import { dashboardAPI } from '../../services/api';

const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<any>(null);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardAPI.getCustomerDashboard();
      setDashboard(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCustomerData = useCallback(async () => {
    if (!user?._id) return;
    try {
      const res = await customersAPI.getMe();
      setCustomer(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load customer');
    }
  }, [user?._id]);

  useEffect(() => {
    loadDashboardData();
    loadCustomerData();
  }, []);

  // Auto-refresh when tab changes
  useEffect(() => {
    loadDashboardData();
    loadCustomerData();
  }, [activeTab]);
  
  const stats = useMemo(() => [
    {
      title: 'Total Orders',
      value: dashboard?.overview?.totalOrders ?? 0,
      icon: ShoppingCart,
      color: 'bg-purple-500'
    },
    {
      title: 'Pending Orders',
      value: dashboard?.overview?.pendingOrders ?? 0,
      icon: Clock,
      color: 'bg-yellow-500'
    },
    {
      title: 'Completed Orders',
      value: dashboard?.overview?.deliveredOrders ?? 0,
      icon: CheckCircle,
      color: 'bg-green-500'
    },
    {
      title: 'Outstanding Amount',
      value: `₹${(dashboard?.profile?.outstandingAmount ?? 0).toFixed(2)}`,
      icon: CreditCard,
      color: 'bg-red-500'
    }
  ], [dashboard]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'place-order', label: 'Place Order', icon: ShoppingCart },
    { id: 'order-history', label: 'Order History', icon: Package },
    { id: 'account', label: 'Account Statement', icon: FileText }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'place-order':
        return (
          <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <PlaceOrder customer={customer} />
          </Suspense>
        );
      case 'order-history':
        return (
          <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <OrderHistory />
          </Suspense>
        );
      case 'account':
        return (
          <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <AccountStatement />
          </Suspense>
        );
      default:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm p-6">
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
                <div className="space-y-3">
                  {dashboard?.recentOrders && dashboard.recentOrders.length > 0 ? (
                    dashboard.recentOrders.map((order: any) => (
                      <div key={order._id} className="flex items-center justify-between py-2 border-b border-gray-100">
                        <div>
                          <p className="font-medium text-gray-900">{order.orderNumber || order.billNumber || '-'}</p>
                          <p className="text-sm text-gray-600">{new Date(order.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">₹{order.netAmount.toFixed(2)}</p>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'confirmed' ? 'bg-purple-100 text-purple-800' :
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Credit Limit</span>
                    <span className="font-medium text-gray-900">₹{dashboard?.profile?.creditLimit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Outstanding Amount</span>
                    <span className="font-medium text-red-600">₹{dashboard?.profile?.outstandingAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Available Credit</span>
                    <span className="font-medium text-green-600">
                      ₹{dashboard?.profile?.availableCredit}
                    </span>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>Contact: {dashboard?.profile?.mobile}</span>
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
    return <div className="text-center py-10">Loading customer...</div>;
  }
  if (error) {
    return <div className="text-center py-10 text-red-600">{error}</div>;
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
                    ? 'border-purple-500 text-purple-600'
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

export default CustomerDashboard;