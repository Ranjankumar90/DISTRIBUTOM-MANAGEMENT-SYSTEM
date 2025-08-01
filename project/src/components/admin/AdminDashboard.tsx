import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TrendingUp, Users, Package, CreditCard, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { dashboardAPI } from '../../services/api';
import AdminOverview from './AdminOverview';
import { lazy, Suspense } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import { measureDashboardLoad } from '../../utils/performance';

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
  const [retryCount, setRetryCount] = useState(0);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Set a timeout for the dashboard request
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Dashboard load timeout. Please try again.')), 15000) // Increased to 15 seconds for production
      );
      
      const dashboardPromise = dashboardAPI.getAdminDashboard();
      const res = await measureDashboardLoad('Admin', () => 
        Promise.race([dashboardPromise, timeoutPromise])
      ) as any;
      
      if (res.success) {
        setDashboard(res.data);
        setRetryCount(0); // Reset retry count on success
      } else {
        setError(res.message || 'Failed to load dashboard');
      }
    } catch (err: any) {
      console.error('Dashboard load error:', err);
      setError(err.message || 'Failed to load dashboard');
      
      // Auto-retry on network errors (max 2 attempts, reduced from 3)
      if (err.message.includes('Network error') || err.message.includes('timeout') && retryCount < 2) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          loadDashboardData();
        }, 2000); // Increased retry delay to 2 seconds for production
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
      loadDashboardData();
    }
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
          <Suspense fallback={<LoadingSpinner size="md" text="Loading business profile..." />}>
            <BusinessProfile />
          </Suspense>
        );
      case 'companies':
        return (
          <Suspense fallback={<LoadingSpinner size="md" text="Loading companies..." />}>
            <CompanyManagement />
          </Suspense>
        );
      case 'customers':
        return (
          <Suspense fallback={<LoadingSpinner size="md" text="Loading customers..." />}>
            <CustomerManagement />
          </Suspense>
        );
      case 'products':
        return (
          <Suspense fallback={<LoadingSpinner size="md" text="Loading products..." />}>
            <ProductManagement />
          </Suspense>
        );
      case 'salesmen':
        return (
          <Suspense fallback={<LoadingSpinner size="md" text="Loading salesmen..." />}>
            <SalesmanManagement />
          </Suspense>
        );
      case 'orders':
        return (
          <Suspense fallback={<LoadingSpinner size="md" text="Loading orders..." />}>
            <OrderManagement />
          </Suspense>
        );
      case 'collections':
        return (
          <Suspense fallback={<LoadingSpinner size="md" text="Loading collections..." />}>
            <CollectionManagement />
          </Suspense>
        );
      case 'ledger':
        return (
          <Suspense fallback={<LoadingSpinner size="md" text="Loading ledger..." />}>
            <CustomerLedger />
          </Suspense>
        );
      case 'direct-bill':
        return (
          <Suspense fallback={<LoadingSpinner size="md" text="Loading direct bill..." />}>
            <DirectBill />
          </Suspense>
        );
      case 'gst-billing':
        return (
          <Suspense fallback={<LoadingSpinner size="md" text="Loading GST billing..." />}>
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading admin dashboard..." fast={true} />
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
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
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