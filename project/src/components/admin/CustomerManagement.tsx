import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Eye, AlertCircle } from 'lucide-react';
import { Customer } from '../../types';
import { customersAPI } from '../../services/api';

const CustomerManagement: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const response = await customersAPI.getAll();
      setCustomers(response.data || []);
    } catch (error: any) {
      setError(error.message || 'Failed to load customers');
      console.error('Fetch customers error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.userId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.userId.mobile.includes(searchTerm)
  );

  const handleAddCustomer = async (customerData: any) => {
    try {
      const payload = { ...customerData, role: 'customer' };
      if (payload.gstNumber === '') delete payload.gstNumber;
      await customersAPI.create(payload);
      await fetchCustomers();
      setShowAddForm(false);
    } catch (error: any) {
      setError(error.message || 'Failed to create customer');
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setShowEditForm(true);
    setSelectedCustomer(customer);
  };

  const handleViewCustomer = (customer: Customer) => {
    setShowEditForm(false);
    setSelectedCustomer(customer);
  };

  const handleSaveEditCustomer = async (id: string, customerData: Partial<Customer>) => {
    try {
      const payload = { ...customerData };
      if (payload.gstNumber === '') delete payload.gstNumber;
      await customersAPI.update(id, payload);
      await fetchCustomers();
      setShowEditForm(false);
      setSelectedCustomer(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update customer');
    }
  };

  const handleUpdateStatus = async (customerId: string, isActive: boolean) => {
    try {
      await customersAPI.update(customerId, { isActive });
      await fetchCustomers();
    } catch (error: any) {
      setError(error.message || 'Failed to update customer status');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Customer Management</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Add Customer</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mobile
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credit Limit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Outstanding
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <tr key={customer._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{customer.userId.name}</div>
                      <div className="text-sm text-gray-500">{customer.address}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {customer.userId.mobile}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{customer.creditLimit?.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{customer.outstandingAmount?.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleUpdateStatus(customer._id, !customer.userId.isActive)}
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        customer.userId.isActive 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {customer.userId.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewCustomer(customer)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEditCustomer(customer)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500">No customers found</p>
          </div>
        )}
      </div>

      {showAddForm && (
        <AddCustomerModal
          onClose={() => setShowAddForm(false)}
          onAdd={handleAddCustomer}
        />
      )}

      {showEditForm && selectedCustomer && (
        <AddCustomerModal
          onClose={() => { setShowEditForm(false); setSelectedCustomer(null); }}
          onAdd={(data) => handleSaveEditCustomer(selectedCustomer._id, data)}
          initialData={selectedCustomer}
          isEdit
        />
      )}
      {!showEditForm && selectedCustomer && (
        <CustomerDetailsModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </div>
  );
};

function stripLeadingZeros(value: string) {
  return value.replace(/^0+(?!$)/, '');
}

const AddCustomerModal: React.FC<{
  onClose: () => void;
  onAdd: (customer: any) => void;
  initialData?: Partial<Customer>;
  isEdit?: boolean;
}> = ({ onClose, onAdd, initialData, isEdit }) => {
  const [formData, setFormData] = useState({
    name: initialData?.userId?.name || '',
    mobile: initialData?.userId?.mobile || '',
    password: '',
    address: initialData?.address || '',
    gstNumber: initialData?.gstNumber || '',
    creditLimit: initialData?.creditLimit || 0,
    territory: initialData?.territory || '',
    customerType: initialData?.customerType || 'retail',
    paymentTerms: initialData?.paymentTerms || 30
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onAdd(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{isEdit ? 'Edit Customer' : 'Add New Customer'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mobile Number *
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: stripLeadingZeros(e.target.value.replace(/[^0-9]/g, '').slice(0, 10)) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={10}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address *
            </label>
            <textarea
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GST Number (optional)
              </label>
              <input
                type="text"
                value={formData.gstNumber}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Credit Limit
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: stripLeadingZeros(e.target.value.replace(/[^0-9]/g, '')) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Territory
              </label>
              <input
                type="text"
                value={formData.territory}
                onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Type
              </label>
              <select
                value={formData.customerType}
                onChange={(e) => setFormData({ ...formData, customerType: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
                <option value="distributor">Distributor</option>
              </select>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CustomerDetailsModal: React.FC<{
  customer: Customer;
  onClose: () => void;
}> = ({ customer, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Details</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Name</label>
              <p className="text-gray-900">{customer.userId.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Mobile</label>
              <p className="text-gray-900">{customer.userId.mobile}</p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-500">Address</label>
            <p className="text-gray-900">{customer.address}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">GST Number</label>
              <p className="text-gray-900">{customer.gstNumber || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Customer Type</label>
              <p className="text-gray-900 capitalize">{customer.customerType}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Credit Limit</label>
              <p className="text-gray-900">₹{customer.creditLimit?.toLocaleString()}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Outstanding</label>
              <p className="text-gray-900">₹{customer.outstandingAmount?.toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Available Credit</label>
              <p className="text-green-600 font-medium">₹{(customer.creditLimit - customer.outstandingAmount)?.toLocaleString()}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Status</label>
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                customer.userId.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {customer.userId.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
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

export default CustomerManagement;