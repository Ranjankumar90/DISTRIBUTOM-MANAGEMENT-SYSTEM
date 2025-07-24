import React, { useState, useEffect } from 'react';
import { Search, Eye, Download, Filter } from 'lucide-react';
import { Order } from '../../types';
import { ordersAPI, customersAPI, productsAPI, companiesAPI } from '../../services/api';

const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [orderRes, customerRes, productRes, companyRes] = await Promise.all([
          ordersAPI.getAll(),
          customersAPI.getAll(),
          productsAPI.getAll(),
          companiesAPI.getAll()
        ]);
        setOrders(orderRes.data || orderRes || []);
        setCustomers(customerRes.data || customerRes || []);
        setProducts(productRes.data || productRes || []);
        setCompanies(companyRes.data || companyRes || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load order management data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredOrders = orders.filter((order: any) => {
    const matchesSearch = (order.id || order._id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.billNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getCustomerName = (customerId: string) => {
    const customer = customers.find((c: any) => c.id === customerId || c._id === customerId);
    return customer?.name || 'Unknown Customer';
  };

  const getProductName = (productId: string) => {
    const product = products.find((p: any) => p.id === productId || p._id === productId);
    return product?.name || 'Unknown Product';
  };

  const updateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    setOrders(orders.map((order: any) =>
      (order.id === orderId || order._id === orderId) ? { ...order, status: newStatus } : order
    ));
    // Optionally, call backend API to update status
    // ordersAPI.updateStatus(orderId, newStatus);
  };

  if (loading) {
    return <div className="text-center py-10">Loading order management data...</div>;
  }
  if (error) {
    return <div className="text-center py-10 text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Order Management</h2>
        <button className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center space-x-2">
          <Download className="h-5 w-5" />
          <span>Export Orders</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bill Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order: any) => (
                <tr key={order.id || order._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.id || order._id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getCustomerName(order.customerId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.orderDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{order.netAmount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order.id || order._id, e.target.value as Order['status'])}
                      className={`text-xs font-medium rounded-full px-2 py-1 border-0 ${
                        order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-red-100 text-red-800'
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.billNumber || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="text-orange-600 hover:text-orange-900"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="text-indigo-600 hover:text-indigo-900">
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          getCustomerName={getCustomerName}
          getProductName={getProductName}
        />
      )}
    </div>
  );
};

const OrderDetailsModal: React.FC<{
  order: Order;
  onClose: () => void;
  getCustomerName: (id: string) => string;
  getProductName: (id: string) => string;
}> = ({ order, onClose, getCustomerName, getProductName }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Order Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Order ID</label>
              <p className="text-gray-900">{order.id}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Customer</label>
              <p className="text-gray-900">{getCustomerName(order.customerId)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Order Date</label>
              <p className="text-gray-900">{order.orderDate}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Status</label>
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                'bg-red-100 text-red-800'
              }`}>
                {order.status}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-3">Order Items</label>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Product
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Quantity
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Rate
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {order.items.map((item: any, index: number) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {getProductName(item.productId)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        ₹{item.rate}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        ₹{item.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <label className="block font-medium text-gray-500">Total Amount</label>
                <p className="text-gray-900">₹{order.totalAmount}</p>
              </div>
              <div>
                <label className="block font-medium text-gray-500">GST Amount</label>
                <p className="text-gray-900">₹{order.gstAmount}</p>
              </div>
              <div>
                <label className="block font-medium text-gray-900">Net Amount</label>
                <p className="text-lg font-bold text-gray-900">₹{order.netAmount}</p>
              </div>
            </div>
          </div>

          {order.billNumber && (
            <div>
              <label className="block text-sm font-medium text-gray-500">Bill Number</label>
              <p className="text-gray-900">{order.billNumber}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderManagement;