import React, { useState, useEffect } from 'react';
import { Download, Calendar, CreditCard, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { customersAPI, ordersAPI, collectionsAPI, dashboardAPI, ledgerAPI } from '../../services/api';

const AccountStatement: React.FC = () => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState('30');
  const [customer, setCustomer] = useState<any>(null);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<any>(null);

  useEffect(() => {
    if (!user?._id) return;
    setLoading(true);
    setError(null);
    const fetchData = async () => {
      try {
        // Get customer profile
        let customerData;
        if (user.role === 'customer') {
          const res = await customersAPI.getMe();
          customerData = res.data;
          console.log('Customer profile loaded:', customerData);
        } else {
          const res = await customersAPI.getById(user._id);
          customerData = res.data || res;
          console.log('Customer profile loaded:', customerData);
        }
        setCustomer(customerData);

        // Get customer-specific ledger entries
        if (customerData?._id) {
          const ledgerRes = await ledgerAPI.getByCustomer(customerData._id);
          if (ledgerRes.success && ledgerRes.data?.entries) {
            console.log('Customer ledger entries:', ledgerRes.data.entries);
            setLedgerEntries(ledgerRes.data.entries);
          } else {
            console.log('No customer ledger entries found');
            setLedgerEntries([]);
          }
        } else {
          console.log('No customer data found');
          setLedgerEntries([]);
        }

        // Fetch dashboard summary from backend
        const dashboardRes = await dashboardAPI.getCustomerDashboard();
        setDashboard(dashboardRes.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load account statement');
        console.error('Account statement error:', err);
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

  // Process ledger entries for statement
  const transactions = ledgerEntries.map(entry => ({
    id: entry._id,
    date: entry.entryDate,
    type: entry.type,
    description: entry.description,
    debit: (entry.type === 'debit' || entry.type === 'order') ? entry.amount : 0,
    credit: (entry.type === 'credit' || entry.type === 'payment') ? entry.amount : 0,
    balance: 0, // Will be calculated
    reference: entry.reference
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate running balance
  let runningBalance = 0;
  transactions.forEach(transaction => {
    runningBalance += transaction.debit - transaction.credit;
    transaction.balance = runningBalance;
  });

  // Calculate summary
  const totalDebits = transactions.reduce((sum, t) => sum + t.debit, 0);
  const totalCredits = transactions.reduce((sum, t) => sum + t.credit, 0);
  const currentBalance = runningBalance;

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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Debits</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalDebits)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingDown className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Credits</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCredits)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Current Balance</p>
              <p className={`text-2xl font-bold ${currentBalance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(Math.abs(currentBalance))}
              </p>
            </div>
          </div>
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
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.description}
                      {transaction.reference && (
                        <div className="text-gray-500 text-xs">Ref: {transaction.reference}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        transaction.type === 'order' 
                          ? 'bg-purple-100 text-purple-800' 
                          : transaction.type === 'payment'
                          ? 'bg-green-100 text-green-800'
                          : transaction.type === 'debit'
                          ? 'bg-red-100 text-red-800'
                          : transaction.type === 'credit'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-red-600">
                      {transaction.debit ? formatCurrency(transaction.debit) : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-green-600">
                      {transaction.credit ? formatCurrency(transaction.credit) : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-semibold">
                      <span className={transaction.balance >= 0 ? 'text-red-600' : 'text-green-600'}>
                        {formatCurrency(Math.abs(transaction.balance))}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AccountStatement;