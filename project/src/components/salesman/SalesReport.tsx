import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, DollarSign, Users, Download, BarChart3 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ordersAPI, collectionsAPI, customersAPI, salesmenAPI } from '../../services/api';

type ExportColumn<T> = { header: string; accessor: (row: T) => string | number | undefined | null };
function exportToCSV<T>(data: T[], columns: ExportColumn<T>[], filename: string) {
  const csvRows = [
    columns.map(col => `"${col.header}"`).join(','),
    ...data.map(row =>
      columns.map(col => `"${col.accessor(row) ?? ''}"`).join(',')
    )
  ];
  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const SalesReport: React.FC = () => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState('30');
  const [reportType, setReportType] = useState('overview');
  const [orders, setOrders] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [salesmen, setSalesmen] = useState<any[]>([]);

  useEffect(() => {
    ordersAPI.getAll().then(res => setOrders(res.data || []));
    collectionsAPI.getAll().then(res => setCollections(res.data || []));
    customersAPI.getAll().then(res => setCustomers(res.data || []));
    salesmenAPI.getAll().then(res => setSalesmen(res.data || []));
  }, []);

  const salesman = salesmen.find(s => s.userId?._id === user?._id);
  const salesmanOrders = orders.filter(o => {
    const orderSalesmanId = typeof o.salesmanId === 'string' ? o.salesmanId : o.salesmanId?._id;
    return orderSalesmanId === salesman?._id;
  });
  const salesmanCollections = collections.filter(c => {
    const collectionSalesmanId = typeof c.salesmanId === 'string' ? c.salesmanId : c.salesmanId?._id;
    return collectionSalesmanId === salesman?._id;
  });

  // Calculate metrics
  const totalSales = salesmanOrders.reduce((sum, order) => sum + (order.netAmount || 0), 0);
  const totalCollections = salesmanCollections.reduce((sum, collection) => sum + (collection.amount || 0), 0);
  const uniqueCustomers = new Set(salesmanOrders.map(o => {
    const customerId = typeof o.customerId === 'string' ? o.customerId : o.customerId?._id;
    return customerId;
  })).size;
  const averageOrderValue = salesmanOrders.length > 0 ? totalSales / salesmanOrders.length : 0;

  // Monthly data for chart (mock data)
  // You may want to fetch monthly data from backend or compute it from orders/collections
  const monthlyData: any[] = [];

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-3xl font-bold text-gray-900">₹{totalSales.toLocaleString()}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Collections</p>
              <p className="text-3xl font-bold text-gray-900">₹{totalCollections.toLocaleString()}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Customers Served</p>
              <p className="text-3xl font-bold text-gray-900">{uniqueCustomers}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
              <p className="text-3xl font-bold text-gray-900">₹{averageOrderValue.toFixed(0)}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <BarChart3 className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Performance</h3>
          <div className="space-y-4">
            {monthlyData.slice(-6).map((data, index) => (
              <div key={data.month} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-green-600">{data.month}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">₹{data.sales.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">{data.orders} orders</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">₹{data.collections.toLocaleString()}</p>
                  <p className="text-xs text-gray-600">collected</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Target vs Achievement</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Monthly Target</span>
                <span className="font-medium text-gray-900">₹{salesman?.targetAmount?.toLocaleString() || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full"
                  style={{ 
                    width: `${salesman ? Math.min((salesman.achievedAmount || 0) / (salesman.targetAmount || 1) * 100, 100) : 0}%` 
                  }}
                ></div>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-gray-600">Achieved: ₹{salesman?.achievedAmount?.toLocaleString() || 0}</span>
                <span className="font-medium text-green-600">
                  {salesman ? ((salesman.achievedAmount || 0) / (salesman.targetAmount || 1) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{salesmanOrders.length}</p>
                <p className="text-sm text-gray-600">Total Orders</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{salesmanCollections.length}</p>
                <p className="text-sm text-gray-600">Collections</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSalesDetails = () => (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Sales Details</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {salesmanOrders.map((order) => {
              const customer = customers.find(c => {
                if (typeof c._id === 'string') {
                  return c._id === (typeof order.customerId === 'string' ? order.customerId : order.customerId?._id);
                }
                return false;
              });
              return (
                <tr key={order._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order._id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {customer?.userId?.name || customer?.name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.orderDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{order.netAmount?.toFixed(2) || '0.00'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'confirmed' ? 'bg-purple-100 text-purple-800' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderCollectionDetails = () => (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Collection Details</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Collection ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mode
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {salesmanCollections.map((collection) => {
              const customer = customers.find(c => {
                if (typeof c._id === 'string') {
                  return c._id === (typeof collection.customerId === 'string' ? collection.customerId : collection.customerId?._id);
                }
                return false;
              });
              return (
                <tr key={collection._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {collection._id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {customer?.userId?.name || customer?.name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {collection.collectionDate || collection.date || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{collection.amount?.toFixed(2) || '0.00'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {collection.paymentMode || collection.mode || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      collection.status === 'cleared' ? 'bg-green-100 text-green-800' :
                      collection.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {collection.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Sales Report</h2>
        <div className="flex space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 3 months</option>
            <option value="365">Last year</option>
          </select>
          <button
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
            onClick={() => {
              if (reportType === 'sales') {
                exportToCSV(
                  salesmanOrders,
                  [
                    { header: 'Order ID', accessor: o => o._id },
                    { header: 'Customer', accessor: o => {
                      const customer = customers.find(c => typeof c._id === 'string' && c._id === (typeof o.customerId === 'string' ? o.customerId : o.customerId?._id));
                      return customer?.userId?.name || customer?.name || 'Unknown';
                    }},
                    { header: 'Date', accessor: o => o.orderDate },
                    { header: 'Amount', accessor: o => o.netAmount },
                    { header: 'Status', accessor: o => o.status }
                  ],
                  'sales-report.csv'
                );
              } else if (reportType === 'collections') {
                exportToCSV(
                  salesmanCollections,
                  [
                    { header: 'Collection ID', accessor: c => c._id },
                    { header: 'Customer', accessor: c => {
                      const customer = customers.find(cu => typeof cu._id === 'string' && cu._id === (typeof c.customerId === 'string' ? c.customerId : c.customerId?._id));
                      return customer?.userId?.name || customer?.name || 'Unknown';
                    }},
                    { header: 'Date', accessor: c => c.collectionDate || c.date },
                    { header: 'Amount', accessor: c => c.amount },
                    { header: 'Mode', accessor: c => c.paymentMode || c.mode },
                    { header: 'Status', accessor: c => c.status }
                  ],
                  'collections-report.csv'
                );
              }
            }}
          >
            <Download className="h-5 w-5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'sales', label: 'Sales Details', icon: BarChart3 },
            { id: 'collections', label: 'Collections', icon: DollarSign }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                reportType === tab.id
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {reportType === 'overview' && renderOverview()}
      {reportType === 'sales' && renderSalesDetails()}
      {reportType === 'collections' && renderCollectionDetails()}
    </div>
  );
};

export default SalesReport;