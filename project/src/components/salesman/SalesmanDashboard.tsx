import React, { useState, useEffect } from 'react';
import { Users, ShoppingCart, DollarSign, Target, TrendingUp, MapPin, Calendar, Phone, Package } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ordersAPI, customersAPI, collectionsAPI, salesmenAPI } from '../../services/api';
import TakeOrder from './TakeOrder';
import CollectPayment from './CollectPayment';
import CustomerVisits from './CustomerVisits';
import SalesReport from './SalesReport';
import SalesmanProductManagement from './SalesmanProductManagement';

const SalesmanDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [salesmen, setSalesmen] = useState<any[]>([]);

  useEffect(() => {
    ordersAPI.getAll().then(res => setOrders(res.data || []));
    customersAPI.getAll().then(res => setCustomers(res.data || []));
    collectionsAPI.getAll().then(res => setCollections(res.data || []));
    salesmenAPI.getAll().then(res => setSalesmen(res.data || []));
  }, []);
  
  const salesman = salesmen.find(s => s.userId._id === user?._id);
  const salesmanOrders = orders.filter(o => (typeof o.salesmanId === 'string' ? o.salesmanId === salesman?._id : o.salesmanId?._id === salesman?._id));
  const salesmanCollections = collections.filter(c => (typeof c.salesmanId === 'string' ? c.salesmanId === salesman?._id : c.salesmanId?._id === salesman?._id));
  const territoryCustomers = customers; // You can filter by territory if needed

  const todayCollections = salesmanCollections.filter(c => 
    c.collectionDate === new Date().toISOString().split('T')[0]
  );

  const stats = [
    {
      title: 'Territory Customers',
      value: territoryCustomers.length,
      icon: Users,
      color: 'bg-green-500'
    },
    {
      title: 'Orders This Month',
      value: salesmanOrders.length,
      icon: ShoppingCart,
      color: 'bg-blue-500'
    },
    {
      title: 'Collections Today',
      value: `₹${todayCollections.reduce((sum, c) => sum + c.amount, 0)}`,
      icon: DollarSign,
      color: 'bg-purple-500'
    },
    {
      title: 'Target Achievement',
      value: `${salesman ? ((salesman.achievedAmount / salesman.targetAmount) * 100).toFixed(0) : 0}%`,
      icon: Target,
      color: 'bg-orange-500'
    }
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'take-order', label: 'Take Order', icon: ShoppingCart },
    { id: 'collect-payment', label: 'Collect Payment', icon: DollarSign },
    { id: 'products', label: 'Product Management', icon: Package },
    { id: 'customer-visits', label: 'Customer Visits', icon: MapPin },
    { id: 'sales-report', label: 'Sales Report', icon: Calendar }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'take-order':
        return <TakeOrder />;
      case 'collect-payment':
        return <CollectPayment />;
      case 'customer-visits':
        return <CustomerVisits />;
      case 'products':
        return <SalesmanProductManagement />;
      case 'sales-report':
        return <SalesReport />;
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
                <div className="space-y-3">
                  {salesmanOrders.slice(0, 5).map((order) => {
                    return (
                      <div key={order._id} className="flex items-center justify-between py-2 border-b border-gray-100">
                        <div>
                          <p className="font-medium text-gray-900">{(() => {
                            const customer = customers.find(c => (typeof c._id === 'string' ? c._id === (typeof order.customerId === 'string' ? order.customerId : order.customerId?._id) : false));
                            return customer ? customer.userId.name : '';
                          })()}</p>
                          <p className="text-sm text-gray-600">{order.orderDate}</p>
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
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Territory Information</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{salesman?.territory}</p>
                      <p className="text-sm text-gray-600">Territory</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Target className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">₹{salesman?.targetAmount}</p>
                      <p className="text-sm text-gray-600">Monthly Target</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">₹{salesman?.achievedAmount}</p>
                      <p className="text-sm text-gray-600">Achieved This Month</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>Contact: {salesman?.mobile}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Monthly Target Progress</span>
                    <span className="font-medium text-gray-900">
                      {salesman ? ((salesman.achievedAmount / salesman.targetAmount) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-green-500 h-3 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${salesman ? Math.min((salesman.achievedAmount / salesman.targetAmount) * 100, 100) : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{territoryCustomers.length}</p>
                    <p className="text-sm text-gray-600">Total Customers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{salesmanOrders.length}</p>
                    <p className="text-sm text-gray-600">Orders Taken</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{salesmanCollections.length}</p>
                    <p className="text-sm text-gray-600">Collections Made</p>
                  </div>
                </div>
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