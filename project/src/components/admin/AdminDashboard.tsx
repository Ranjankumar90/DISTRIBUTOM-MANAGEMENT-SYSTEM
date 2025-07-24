import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Package, ShoppingCart, TrendingUp, IndianRupee, Building, CreditCard, Building2 } from 'lucide-react';
import { productsAPI, customersAPI, ordersAPI } from '../../services/api';
import { DashboardStats } from '../../types';
import CustomerManagement from './CustomerManagement';
import SalesmanManagement from './SalesmanManagement';
import ProductManagement from './ProductManagement';
import OrderManagement from './OrderManagement';
import GSTBilling from './GSTBilling';
import BusinessProfile from './BusinessProfile';
import CustomerLedger from './CustomerLedger';
import CompanyManagement from './CompanyManagement';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [customers, setCustomers] = useState<any[]>([]);
  const [salesmen, setSalesmen] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [customerRes, productRes, orderRes] = await Promise.all([
          customersAPI.getAll(),
          productsAPI.getAll(),
          ordersAPI.getAll()
        ]);
        setCustomers(customerRes.data || customerRes || []);
        setProducts(productRes.data || productRes || []);
        setOrders(orderRes.data || orderRes || []);
        // If salesmen are a subset of customers, filter by role
        setSalesmen((customerRes.data || customerRes || []).filter((c: any) => c.role === 'salesman'));
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = [
    {
      title: 'Total Customers',
      value: customers.length,
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Active Salesmen',
      value: salesmen.filter((s: any) => s.isActive).length,
      icon: UserPlus,
      color: 'bg-green-500'
    },
    {
      title: 'Products',
      value: products.filter((p: any) => p.isActive).length,
      icon: Package,
      color: 'bg-purple-500'
    },
    {
      title: 'Total Orders',
      value: orders.length,
      icon: ShoppingCart,
      color: 'bg-orange-500'
    }
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'business', label: 'Business Profile', icon: Building },
    { id: 'companies', label: 'Companies', icon: Building2 },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'salesmen', label: 'Salesmen', icon: UserPlus },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'billing', label: 'GST Billing', icon: IndianRupee },
    { id: 'ledger', label: 'Customer Ledger', icon: CreditCard }
  ];

  const renderContent = () => {
    if (loading) {
      return <div className="text-center py-10">Loading dashboard...</div>;
    }
    if (error) {
      return <div className="text-center py-10 text-red-600">{error}</div>;
    }
    switch (activeTab) {
      case 'business':
        return <BusinessProfile />;
      case 'companies':
        return <CompanyManagement />;
      case 'customers':
        return <CustomerManagement />;
      case 'salesmen':
        return <SalesmanManagement />;
      case 'products':
        return <ProductManagement />;
      case 'orders':
        return <OrderManagement />;
      case 'billing':
        return <GSTBilling />;
      case 'ledger':
        return <CustomerLedger />;
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
                {orders.slice(0, 5).map((order: any) => (
                  <div key={order._id || order.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div>
                      <p className="font-medium text-gray-900">{order.orderNumber}</p>
                      <p className="text-sm text-gray-600">{new Date(order.orderDate).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">₹{order.netAmount}</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers</h3>
                {customers.slice(0, 5).map((customer: any) => (
                  <div key={customer._id || customer.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div>
                      <p className="font-medium text-gray-900">{customer.name}</p>
                      <p className="text-sm text-gray-600">{customer.territory || 'No territory'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">₹{customer.outstandingAmount}</p>
                      <p className="text-xs text-gray-600">Outstanding</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
    }
  };

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