import React, { useState, useEffect } from 'react';
import { Download, Calendar, CreditCard, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { customersAPI, ordersAPI, collectionsAPI, dashboardAPI } from '../../services/api';

const AccountStatement: React.FC = () => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState('30');
  const [customer, setCustomer] = useState<any>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [customerCollections, setCustomerCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<any>(null);

  useEffect(() => {
    if (!user?._id) return;
    setLoading(true);
    setError(null);
    const fetchData = async () => {
      try {
        let customerData;
        if (user.role === 'customer') {
          const res = await customersAPI.getMe();
          customerData = res.data;
        } else {
          const res = await customersAPI.getById(user._id);
          customerData = res.data || res;
        }
        const ordersData = await ordersAPI.getAll({ customerId: user._id });
        const collectionsData = await collectionsAPI.getAll({ customerId: user._id });
        // Fetch dashboard summary from backend
        const dashboardRes = await dashboardAPI.getCustomerDashboard();
        setDashboard(dashboardRes.data);
        setCustomer(customerData);
        setCustomerOrders(ordersData.data || ordersData);
        setCustomerCollections(collectionsData.data || collectionsData);
      } catch (err: any) {
        setError(err.message || 'Failed to load account statement');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?._id]);

  // Utility for formatting currency
  function formatCurrency(amount: number) {
    return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  // Utility for formatting date
  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  // Combine orders and collections for statement
  const transactions = [
    ...customerOrders
      .filter(order => order.status === 'delivered')
      .map(order => ({
        id: order._id || order.id,
        date: order.orderDate,
        type: 'order' as const,
        description: `Order ${order.orderNumber || order.billNumber || ''}`.trim(),
        debit: order.netAmount,
        credit: 0,
        balance: 0 // Will be calculated
      })),
    ...customerCollections.map(collection => ({
      id: collection._id || collection.id,
      date: collection.collectionDate,
      type: 'payment' as const,
      description: `Payment - ${collection.paymentMode || ''}`.trim(),
      debit: 0,
      credit: collection.amount,
      balance: 0 // Will be calculated
    }))
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate running balance
  let runningBalance = 0;
  transactions.forEach(transaction => {
    runningBalance += transaction.debit - transaction.credit;
    transaction.balance = runningBalance;
  });

  const totalOrders = customerOrders.reduce((sum, order) => sum + (order.netAmount || 0), 0);
  const totalPayments = customerCollections.reduce((sum, collection) => sum + (collection.amount || 0), 0);

  if (loading) {
    return <div className="text-center py-8">Loading account statement...</div>;
  }
  if (error) {
    return <div className="text-center py-8 text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Account Statement</h2>
        <div className="flex space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="30">Last 30 days</option>
            <option value="90">Last 3 months</option>
            <option value="180">Last 6 months</option>
            <option value="365">Last year</option>
          </select>
          <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Debit
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credit
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(transaction.date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      transaction.type === 'order' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {transaction.type === 'order' ? 'Order' : 'Payment'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-red-600">{transaction.debit ? formatCurrency(transaction.debit) : ''}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-green-600">{transaction.credit ? formatCurrency(transaction.credit) : ''}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-semibold">{formatCurrency(transaction.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AccountStatement;