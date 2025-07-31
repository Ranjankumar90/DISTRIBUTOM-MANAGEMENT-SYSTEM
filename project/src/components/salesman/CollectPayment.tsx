import React, { useState, useEffect } from 'react';
import { DollarSign, Search, CreditCard, Smartphone, Building, User } from 'lucide-react';
import { customersAPI } from '../../services/api';
import { collectionsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Customer, Collection } from '../../types';

const CollectPayment: React.FC = () => {
  const { user } = useAuth();
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<Collection['paymentMode']>('cash');
  const [reference, setReference] = useState('');
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);

  useEffect(() => {
    // Use the new API to get customers with ledger-based outstanding amounts
    customersAPI.getWithOutstanding().then(res => setCustomers(res.data || []));
    // Fetch recent collections for this salesman
    collectionsAPI.getAll().then(res => setCollections(res.data || []));
  }, []);

  const handleCollectPayment = async () => {
    console.log('Collecting payment...');
    if (!selectedCustomer || !amount) {
      console.log('No customer selected or amount is empty.');
      return;
    }
    const collection: Partial<Collection> = {
      customerId: selectedCustomer._id,
      salesmanId: user?._id,
      amount: parseFloat(amount),
      paymentMode,
      collectionDate: new Date().toISOString().split('T')[0],
      paymentDetails: reference ? { reference } : undefined,
      status: 'cleared',
      createdBy: user?._id
    };
    try {
      console.log('Collection data:', collection);
      await collectionsAPI.create(collection);
      alert(`Payment collected from ${selectedCustomer.user?.name}!\nAmount: ₹${amount}\nMode: ${paymentMode}`);
      // Reset form
      setSelectedCustomer(null);
      setAmount('');
      setReference('');
      setPaymentMode('cash');
    } catch (err: any) {
      console.error('Payment collection error:', err);
      if (err.backend && err.backend.error) {
        alert('Payment collection failed: ' + err.backend.error);
      } else if (err && err.message) {
        alert('Payment collection failed: ' + err.message);
      } else {
        alert('Payment collection failed. See console for details.');
      }
    }
  };

  const getPaymentModeIcon = (mode: Collection['paymentMode']) => {
    switch (mode) {
      case 'cash':
        return <DollarSign className="h-5 w-5" />;
      case 'cheque':
        return <CreditCard className="h-5 w-5" />;
      case 'upi':
        return <Smartphone className="h-5 w-5" />;
      case 'bank_transfer':
        return <Building className="h-5 w-5" />;
      default:
        return <DollarSign className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Collect Payment</h2>
        <button
          onClick={() => setShowCustomerSelect(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
        >
          <User className="h-5 w-5" />
          <span>{selectedCustomer ? selectedCustomer.user.name : 'Select Customer'}</span>
        </button>
      </div>

      {!selectedCustomer ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Customer</h3>
          <p className="text-gray-600 mb-4">Choose a customer to collect payment from</p>
          <button
            onClick={() => setShowCustomerSelect(true)}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
          >
            Select Customer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Customer Name</label>
                <p className="text-gray-900 font-medium">{selectedCustomer.user.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Address</label>
                <p className="text-gray-900">{selectedCustomer.address}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Mobile</label>
                <p className="text-gray-900">{selectedCustomer.user.mobile}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Credit Limit</label>
                  <p className="text-gray-900 font-medium">₹{selectedCustomer.creditLimit.toFixed(2)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Outstanding</label>
                  <p className="text-red-600 font-medium">₹{selectedCustomer.outstandingAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'cash', label: 'Cash' },
                    { value: 'cheque', label: 'Cheque' },
                    { value: 'upi', label: 'UPI' },
                    { value: 'bank_transfer', label: 'Bank Transfer' }
                  ].map((mode) => (
                    <button
                      key={mode.value}
                      onClick={() => setPaymentMode(mode.value as Collection['paymentMode'])}
                      className={`flex items-center justify-center space-x-2 py-3 px-4 border rounded-lg transition-colors ${
                        paymentMode === mode.value
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {getPaymentModeIcon(mode.value as Collection['paymentMode'])}
                      <span className="text-sm font-medium">{mode.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {(paymentMode === 'cheque' || paymentMode === 'upi' || paymentMode === 'bank_transfer') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder={
                      paymentMode === 'cheque' ? 'Cheque number' :
                      paymentMode === 'upi' ? 'UPI transaction ID' :
                      'Bank reference number'
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              )}

              <div className="pt-4">
                <button
                  onClick={handleCollectPayment}
                  disabled={!amount || parseFloat(amount) <= 0}
                  className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                >
                  Collect Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Collections Section */}
      <div className="bg-white rounded-xl shadow-sm mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 px-6 pt-6">Recent Collections</h3>
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2">Collection #</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Mode</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {collections.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-4 text-gray-500">No collections found</td>
              </tr>
            )}
            {collections.map((col: any) => (
              <tr key={col._id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{col.collectionNumber}</td>
                <td className="px-4 py-2">{col.customerId?.userId?.name}</td>
                <td className="px-4 py-2">₹{col.amount}</td>
                <td className="px-4 py-2">{col.paymentMode}</td>
                <td className="px-4 py-2">{new Date(col.collectionDate).toLocaleDateString()}</td>
                <td className="px-4 py-2 font-semibold capitalize">{col.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCustomerSelect && (
        <CustomerSelectModal
          customers={customers.filter(c => c.outstandingAmount > 0)}
          onSelect={(customer) => {
            setSelectedCustomer(customer);
            setShowCustomerSelect(false);
          }}
          onClose={() => setShowCustomerSelect(false)}
        />
      )}
    </div>
  );
};

const CustomerSelectModal: React.FC<{
  customers: any[];
  onSelect: (customer: any) => void;
  onClose: () => void;
}> = ({ customers, onSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = customers.filter(customer =>
    customer.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.user.mobile.includes(searchTerm)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Select Customer for Payment</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers with outstanding..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredCustomers.map((customer) => (
            <div
              key={customer._id}
              onClick={() => onSelect(customer)}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-gray-900">{customer.user.name}</h4>
                  <p className="text-sm text-gray-600">{customer.address}</p>
                  <p className="text-sm text-gray-600">{customer.user.mobile}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-gray-600">Credit: ₹{customer.creditLimit.toFixed(2)}</p>
                  <p className="text-red-600">Outstanding: ₹{customer.outstandingAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No customers with outstanding amounts found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectPayment;