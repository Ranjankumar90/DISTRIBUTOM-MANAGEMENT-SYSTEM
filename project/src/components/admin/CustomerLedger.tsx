import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, Edit, Trash2 } from 'lucide-react';
import { customersAPI, ledgerAPI } from '../../services/api';
import { LedgerEntry, Customer } from '../../types';

const CustomerLedger: React.FC = () => {
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all'); // <-- add this
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFinalBalanceOnly, setShowFinalBalanceOnly] = useState(false);

  useEffect(() => {
    customersAPI.getAll().then(res => {
      if (res.success && res.data) {
        setCustomers(res.data);
      }
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    const fetchLedgerEntries = async () => {
      try {
        let res;
        
        if (selectedCustomer !== 'all') {
          // Fetch entries for specific customer
          if (typeof ledgerAPI.getByCustomer === 'function') {
            res = await ledgerAPI.getByCustomer(selectedCustomer);
          } else {
            res = await ledgerAPI.getAll({ customerId: selectedCustomer });
          }
        } else {
          // Fetch all entries for admin view
          res = await ledgerAPI.getAll();
        }
        
        if (res?.data?.entries && Array.isArray(res.data.entries)) {
          console.log('Raw ledger API response:', res.data.entries);
          setLedgerEntries(res.data.entries);
        } else if (Array.isArray(res.data)) {
          console.log('Raw ledger API response (direct array):', res.data);
          setLedgerEntries(res.data);
        } else {
          console.log('No ledger entries found in response:', res);
          setLedgerEntries([]);
        }
      } catch (err: any) {
        setError('Failed to fetch ledger entries: ' + (err.message || 'Unknown error'));
        console.error('Ledger API error:', err);
        setLedgerEntries([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLedgerEntries();
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

  // Debug log for filtered entries
  console.log('Filtered ledger entries:', filteredEntries);

  // Check for order type entries in the raw data but not in filtered
  const hasOrderEntryRaw = ledgerEntries.some(e => e.type === 'order');
  const hasOrderEntryFiltered = filteredEntries.some(e => e.type === 'order');

  const getRunningBalance = (upToIndex: number) => {
    // Use sortedEntries instead of ledgerEntries for correct calculation
    const customerEntries = filteredEntries.slice(0, upToIndex + 1);
    return customerEntries.reduce((balance, entry) => {
      const amount = entry.amount || 0;
      if (entry.type === 'debit' || entry.type === 'order') {
        return balance + amount;
      } else if (entry.type === 'credit' || entry.type === 'payment') {
        return balance - amount;
      } else if (entry.type === 'adjustment') {
        return balance + amount; // adjustment can be +/- based on context
      } else if (entry.type === 'opening_balance') {
        return amount; // overrides previous
      }
      return balance;
    }, 0);
  };

  const handleAddEntry = async (entryData: Partial<LedgerEntry>) => {
    setLoading(true);
    setError(null);
    try {
      await ledgerAPI.create({
        customerId: entryData.customerId,
        entryDate: entryData.entryDate,
        description: entryData.description,
        type: entryData.type,
        amount: entryData.amount,
        reference: entryData.reference
      });
      setShowAddEntry(false);
      // Refresh ledger entries from backend
      if (selectedCustomer !== 'all' && typeof ledgerAPI.getByCustomer === 'function') {
        const res = await ledgerAPI.getByCustomer(selectedCustomer);
        if (res?.data?.entries && Array.isArray(res.data.entries)) {
          setLedgerEntries(res.data.entries);
        } else {
          setLedgerEntries([]);
        }
      } else {
        const res = await ledgerAPI.getAll(selectedCustomer !== 'all' ? { customerId: selectedCustomer } : undefined);
        if (res?.data?.entries && Array.isArray(res.data.entries)) {
          setLedgerEntries(res.data.entries);
        } else if (Array.isArray(res.data)) {
          setLedgerEntries(res.data);
        } else {
          setLedgerEntries([]);
        }
      }
    } catch (err) {
      setError('Failed to add ledger entry');
      console.error('Add ledger entry error:', err);
    } finally {
      setLoading(false);
    }
  };

  // When rendering filteredEntries, sort by date ascending (oldest first)
  const sortedEntries = filteredEntries.slice().sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-2xl font-bold text-gray-900">Customer Ledger Management</div>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={showFinalBalanceOnly}
              onChange={e => setShowFinalBalanceOnly(e.target.checked)}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span>Show only final balance</span>
          </label>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            onClick={() => setShowAddEntry(true)}
          >
            + Add Entry
          </button>
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
          {showFinalBalanceOnly ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-lg text-gray-700 mb-2">Final Balance</div>
              <div className={`text-4xl font-bold ${sortedEntries.length > 0 && getRunningBalance(sortedEntries.length - 1) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{sortedEntries.length > 0 ? getRunningBalance(sortedEntries.length - 1).toFixed(2) : '0.00'}
              </div>
            </div>
          ) : (
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={8} className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
                ) : error ? (
                  <tr><td colSpan={8} className="px-6 py-4 text-center text-red-600">{error}</td></tr>
                ) : sortedEntries.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-4 text-center text-gray-500">No entries found.</td></tr>
                ) : (
                  sortedEntries.map((entry, index) => {
                    const balance = getRunningBalance(index);
                    const customerId = typeof entry.customerId === 'object' ? entry.customerId._id : entry.customerId;
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
                          {(entry.type === 'debit' || entry.type === 'order') && `₹${entry.amount.toFixed(2)}`}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-green-600">
                          {(entry.type === 'credit' || entry.type === 'payment') && `₹${entry.amount.toFixed(2)}`}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          <span className={balance > 0 ? 'text-red-600' : 'text-green-600'}>
                            ₹{Math.abs(balance).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          <div className="flex space-x-2">
                            <button className="text-indigo-600 hover:text-indigo-900">
                              <Edit className="h-4 w-4" />
                            </button>
                            <button className="text-red-600 hover:text-red-900">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showAddEntry && (
        <AddLedgerEntryModal
          customers={customers}
          onClose={() => setShowAddEntry(false)}
          onAdd={handleAddEntry}
        />
      )}
      {hasOrderEntryRaw && !hasOrderEntryFiltered && (
        <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-2 rounded mb-2">
          Warning: There are 'order' type ledger entries in the API response, but they are not shown in the table. Check your filters or table rendering logic.
        </div>
      )}
    </div>
  );
};

const AddLedgerEntryModal: React.FC<{
  customers: Customer[];
  onClose: () => void;
  onAdd: (entry: Partial<LedgerEntry>) => void;
}> = ({ customers, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    customerId: '',
    date: new Date().toISOString().slice(0, 10),
    description: '',
    type: 'debit' as LedgerEntry['type'],
    amount: '',
    reference: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || !formData.description || !formData.amount || parseFloat(formData.amount) <= 0) return;
    onAdd({
      customerId: formData.customerId,
      entryDate: formData.date,
      description: formData.description,
      type: formData.type,
      amount: parseFloat(formData.amount),
      reference: formData.reference
    });
  };

  const stripLeadingZeros = (value: string) => {
    return value.replace(/^0+/, '');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Add Ledger Entry</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <select
            required
            value={formData.customerId}
            onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="">Select Customer</option>
            {customers.map(customer => (
              <option key={customer._id} value={customer._id}>
                {customer.userId?.name || 'Unknown Customer'}
              </option>
            ))}
          </select>
          <input
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as LedgerEntry['type'] })}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="debit">Debit</option>
            <option value="credit">Credit</option>
            <option value="adjustment">Adjustment</option>
          </select>
          <input
            type="text"
            placeholder="Description"
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={formData.amount}
            onChange={e => setFormData({ ...formData, amount: stripLeadingZeros(e.target.value.replace(/[^0-9]/g, '')) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Reference (optional)"
            value={formData.reference}
            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
          <div className="flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Add Entry</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerLedger;
