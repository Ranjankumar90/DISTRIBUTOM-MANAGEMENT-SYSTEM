import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TrendingUp, Users, Package, CreditCard, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { dashboardAPI } from '../../services/api';
import AdminOverview from './AdminOverview';
import { lazy, Suspense } from 'react';

// Lazy load components for better performance
const BusinessProfile = lazy(() => import('./BusinessProfile'));
const CompanyManagement = lazy(() => import('./CompanyManagement'));
const CustomerManagement = lazy(() => import('./CustomerManagement'));
const ProductManagement = lazy(() => import('./ProductManagement'));
const SalesmanManagement = lazy(() => import('./SalesmanManagement'));
const OrderManagement = lazy(() => import('./OrderManagement'));
const CollectionManagement = lazy(() => import('./CollectionManagement'));
const CustomerLedger = lazy(() => import('./CustomerLedger'));
const DirectBill = lazy(() => import('./DirectBill'));
const GSTBilling = lazy(() => import('./GSTBilling'));

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardAPI.getAdminDashboard();
      setDashboard(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Auto-refresh when tab changes
  useEffect(() => {
    loadDashboardData();
  }, [activeTab]);

  const stats = useMemo(() => [
    {
      title: 'Total Customers',
      value: dashboard?.overview?.customers?.total ?? 0,
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Total Orders',
      value: dashboard?.overview?.orders?.total ?? 0,
      icon: Package,
      color: 'bg-green-500'
    },
    {
      title: 'Total Sales',
      value: `₹${(dashboard?.financial?.totalSales ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: 'bg-purple-500'
    },
    {
      title: 'Outstanding Amount',
      value: `₹${(dashboard?.financial?.totalOutstanding ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: CreditCard,
      color: 'bg-red-500'
    }
  ], [dashboard]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'business-profile', label: 'Business Profile', icon: Settings },
    { id: 'companies', label: 'Companies', icon: Package },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'salesmen', label: 'Salesmen', icon: Users },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'collections', label: 'Collections', icon: CreditCard },
    { id: 'ledger', label: 'Customer Ledger', icon: CreditCard },
    { id: 'direct-bill', label: 'Direct Bill', icon: Package },
    { id: 'gst-billing', label: 'GST Billing', icon: Package }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'business-profile':
        return (
          <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <BusinessProfile />
          </Suspense>
        );
      case 'companies':
        return (
          <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <CompanyManagement />
          </Suspense>
        );
      case 'customers':
        return (
          <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <CustomerManagement />
          </Suspense>
        );
      case 'products':
        return (
          <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <ProductManagement />
          </Suspense>
        );
      case 'salesmen':
        return (
          <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <SalesmanManagement />
          </Suspense>
        );
      case 'orders':
        return (
          <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <OrderManagement />
          </Suspense>
        );
      case 'collections':
        return (
          <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <CollectionManagement />
          </Suspense>
        );
      case 'ledger':
        return (
          <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <CustomerLedger />
          </Suspense>
        );
      case 'direct-bill':
        return (
          <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <DirectBill />
          </Suspense>
        );
      case 'gst-billing':
        return (
          <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <GSTBilling />
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
                          <p className="text-sm text-gray-600">{order.customerId?.userId?.name || 'Unknown Customer'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">₹{order.netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers by Outstanding</h3>
                <div className="space-y-3">
                  {dashboard?.topCustomers && dashboard.topCustomers.length > 0 ? (
                    dashboard.topCustomers.map((customer: any) => (
                      <div key={customer._id} className="flex items-center justify-between py-2 border-b border-gray-100">
                        <div>
                          <p className="font-medium text-gray-900">{customer.userId?.name || 'Unknown Customer'}</p>
                          <p className="text-sm text-gray-600">{customer.userId?.mobile || 'No mobile'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-red-600">₹{customer.outstandingAmount.toFixed(2)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-4">No customers with outstanding amounts</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return <div className="text-center py-10">Loading admin dashboard...</div>;
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
                    ? 'border-blue-500 text-blue-600'
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

export default AdminDashboard;