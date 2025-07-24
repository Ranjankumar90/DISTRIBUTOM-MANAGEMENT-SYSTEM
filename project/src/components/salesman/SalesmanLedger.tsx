import React, { useState, useEffect } from 'react';
import { Search, Calendar } from 'lucide-react';
import { customersAPI, ledgerAPI } from '../../services/api';
import { LedgerEntry, Customer } from '../../types';

const SalesmanLedger: React.FC = () => {
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    customersAPI.getAll().then(res => {
      if (res.success && res.data) {
        setCustomers(res.data);
      }
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    if (selectedCustomer !== 'all') {
      if (typeof ledgerAPI.getByCustomer === 'function') {
        ledgerAPI.getByCustomer(selectedCustomer)
          .then((res: any) => {
            if (res?.data?.entries && Array.isArray(res.data.entries)) {
              setLedgerEntries(res.data.entries);
            } else {
              setLedgerEntries([]);
            }
            setLoading(false);
          })
          .catch((err: any) => {
            setError('Failed to fetch ledger entries');
            setLoading(false);
          });
      } else {
        ledgerAPI.getAll({ customerId: selectedCustomer })
          .then((res: any) => {
            if (res?.data?.entries && Array.isArray(res.data.entries)) {
              setLedgerEntries(res.data.entries);
            } else if (Array.isArray(res.data)) {
              setLedgerEntries(res.data);
            } else {
              setLedgerEntries([]);
            }
            setLoading(false);
          })
          .catch((err: any) => {
            setError('Failed to fetch ledger entries');
            setLoading(false);
          });
      }
    } else {
      ledgerAPI.getAll()
        .then((res: any) => {
          if (res?.data?.entries && Array.isArray(res.data.entries)) {
            setLedgerEntries(res.data.entries);
          } else if (Array.isArray(res.data)) {
            setLedgerEntries(res.data);
          } else {
            setLedgerEntries([]);
          }
          setLoading(false);
        })
        .catch((err: any) => {
          setError('Failed to fetch ledger entries');
          setLoading(false);
        });
    }
  }, [selectedCustomer]);

  const getCustomerName = (customerId: string | { _id: string; userId: any }) => {
    const id = typeof customerId === 'object' ? customerId._id : customerId;
    const customer = customers.find(c => c._id === id);
    return customer?.userId?.name ?? 'Unknown Customer';
  };

  const filteredEntries = ledgerEntries.filter(entry => {
    const matchesSearch = entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      getCustomerName(entry.customerId).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = !dateFilter || entry.entryDate?.slice(0, 10) === dateFilter;
    const matchesType = selectedType === 'all' || entry.type === selectedType;
    return matchesSearch && matchesDate && matchesType;
  });

  const getRunningBalance = (upToIndex: number) => {
    const customerEntries = ledgerEntries.slice(0, upToIndex + 1);
    return customerEntries.reduce((balance, entry) => {
      const amount = entry.amount || 0;
      return entry.type === 'debit' || entry.type === 'order'
        ? balance + amount
        : balance - amount;
    }, 0);
  };

  const sortedEntries = filteredEntries.slice().sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());

  // Calculate final balance
  const finalBalance = sortedEntries.length > 0 ? getRunningBalance(sortedEntries.length - 1) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-2xl font-bold text-gray-900">Customer Ledger</div>
      </div>

      <div className="flex flex-col items-center justify-center py-2">
        <div className="text-lg text-gray-700 mb-2">Final Balance</div>
        <div className={`text-4xl font-bold ${finalBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
          ₹{Math.abs(finalBalance).toFixed(2)}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Customers</option>
              {customers.map((customer) => (
                <option key={customer._id} value={customer._id}>
                  {customer.userId?.name || 'Unknown Customer'}
                </option>
              ))}
            </select>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="debit">Debit</option>
              <option value="credit">Credit</option>
              <option value="order">Orders</option>
              <option value="payment">Payments</option>
              <option value="adjustment">Adjustments</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
              ) : error ? (
                <tr><td colSpan={7} className="px-6 py-4 text-center text-red-600">{error}</td></tr>
              ) : sortedEntries.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-4 text-center text-gray-500">No entries found.</td></tr>
              ) : (
                sortedEntries.map((entry, index) => {
                  const balance = getRunningBalance(index);
                  return (
                    <tr key={entry._id || index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{entry.entryDate?.slice(0, 10)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{getCustomerName(entry.customerId)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {entry.description}
                        {entry.reference && <div className="text-gray-500 text-xs">Ref: {entry.reference}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">{entry.type}</td>
                      <td className="px-6 py-4 text-right text-sm text-red-600">
                        {(entry.type === 'debit' || entry.type === 'order') && `₹${entry.amount}`}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-green-600">
                        {(entry.type === 'credit' || entry.type === 'payment') && `₹${entry.amount}`}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <span className={balance > 0 ? 'text-red-600' : 'text-green-600'}>
                          ₹{Math.abs(balance).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesmanLedger; 