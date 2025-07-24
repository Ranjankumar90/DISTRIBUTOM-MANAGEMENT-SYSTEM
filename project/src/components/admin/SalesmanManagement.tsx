import React, { useState } from 'react';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { Salesman } from '../../types';
import { salesmenAPI } from '../../services/api';

const SalesmanManagement: React.FC = () => {
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedSalesman, setSelectedSalesman] = useState<Salesman | null>(null);
  const [lastGeneratedPassword, setLastGeneratedPassword] = useState<string | null>(null);

  React.useEffect(() => {
    fetchSalesmen();
  }, []);

  const fetchSalesmen = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await salesmenAPI.getAll();
      setSalesmen(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load salesmen');
    } finally {
      setIsLoading(false);
    }
  };

  const generateRandomPassword = () => {
    return Math.random().toString(36).slice(-8);
  };

  const filteredSalesmen = salesmen.filter(salesman =>
    salesman.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    salesman.userId?.mobile?.includes(searchTerm) ||
    (salesman.territory || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddSalesman = async (salesmanData: Partial<Salesman>) => {
    try {
      setIsLoading(true);
      setError('');
      const password = generateRandomPassword();
      setLastGeneratedPassword(password);
      const response = await salesmenAPI.create({
        ...salesmanData,
        password,
        role: 'salesman',
      });
      if (response.success) {
        await fetchSalesmen();
        setShowAddForm(false);
      } else {
        setError(response.message || 'Failed to add salesman');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add salesman');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSalesman = (salesman: Salesman) => {
    setShowEditForm(true);
    setSelectedSalesman(salesman);
  };

  const handleViewSalesman = (salesman: Salesman) => {
    setShowEditForm(false);
    setSelectedSalesman(salesman);
  };

  const handleSaveEditSalesman = async (id: string, salesmanData: Partial<Salesman>) => {
    try {
      await salesmenAPI.update(id, salesmanData);
      await fetchSalesmen();
      setShowEditForm(false);
      setSelectedSalesman(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update salesman');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Salesman Management</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Add Salesman</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
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
              placeholder="Search salesmen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Salesman
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mobile
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Territory
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Target/Achieved
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
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
              {filteredSalesmen.map((salesman) => {
                const performance = salesman.targetAmount > 0 ? (salesman.achievedAmount / salesman.targetAmount) * 100 : 0;
                return (
                  <tr key={salesman._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{salesman.userId?.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {salesman.userId?.mobile}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {salesman.territory}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>₹{salesman.achievedAmount}</div>
                      <div className="text-xs text-gray-500">of ₹{salesman.targetAmount}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className={`h-2 rounded-full ${
                              performance >= 80 ? 'bg-green-500' :
                              performance >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(performance, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">{performance.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        salesman.userId?.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {salesman.userId?.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewSalesman(salesman)}
                          className="text-green-600 hover:text-green-900"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditSalesman(salesman)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showAddForm && (
        <AddSalesmanModal
          onClose={() => setShowAddForm(false)}
          onAdd={handleAddSalesman}
        />
      )}

      {showEditForm && selectedSalesman && (
        <AddSalesmanModal
          onClose={() => { setShowEditForm(false); setSelectedSalesman(null); }}
          onAdd={(data) => handleSaveEditSalesman(selectedSalesman._id, data)}
          initialData={selectedSalesman}
          isEdit
        />
      )}

      {!showEditForm && selectedSalesman && (
        <SalesmanDetailsModal
          salesman={selectedSalesman}
          onClose={() => setSelectedSalesman(null)}
          password={lastGeneratedPassword || undefined}
        />
      )}

      {lastGeneratedPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Salesman Created</h3>
            <p className="mb-2">The password for the new salesman is:</p>
            <div className="mb-4 text-2xl font-mono font-bold text-blue-700">{lastGeneratedPassword}</div>
            <button
              onClick={() => setLastGeneratedPassword(null)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function stripLeadingZeros(value: string) {
  return value.replace(/^0+(?!$)/, '');
}

const AddSalesmanModal: React.FC<{
  onClose: () => void;
  onAdd: (salesman: Partial<Salesman>) => void;
  initialData?: Partial<Salesman>;
  isEdit?: boolean;
}> = ({ onClose, onAdd, initialData, isEdit }) => {
  const [formData, setFormData] = useState({
    name: initialData?.userId?.name || '',
    mobile: initialData?.userId?.mobile || '',
    territory: initialData?.territory || '',
    targetAmount: initialData?.targetAmount || 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{isEdit ? 'Edit Salesman' : 'Add New Salesman'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Salesman Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mobile Number
            </label>
            <input
              type="tel"
              required
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Territory
            </label>
            <input
              type="text"
              required
              value={formData.territory}
              onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Amount
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={formData.targetAmount}
              onChange={(e) => setFormData({ ...formData, targetAmount: stripLeadingZeros(e.target.value.replace(/[^0-9]/g, '')) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              {isEdit ? 'Save Changes' : 'Add Salesman'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SalesmanDetailsModal: React.FC<{
  salesman: Salesman;
  onClose: () => void;
  password?: string;
}> = ({ salesman, onClose, password }) => {
  const performance = salesman.targetAmount > 0 ? (salesman.achievedAmount / salesman.targetAmount) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Salesman Details</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Name</label>
              <p className="text-gray-900">{salesman.userId?.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Mobile</label>
              <p className="text-gray-900">{salesman.userId?.mobile}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Territory</label>
              <p className="text-gray-900">{salesman.territory}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Status</label>
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                salesman.userId?.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {salesman.userId?.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Target Amount</label>
              <p className="text-gray-900">₹{salesman.targetAmount}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Achieved Amount</label>
              <p className="text-gray-900">₹{salesman.achievedAmount}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Performance</label>
            <div className="flex items-center">
              <div className="w-full bg-gray-200 rounded-full h-4 mr-3">
                <div
                  className={`h-4 rounded-full ${
                    performance >= 80 ? 'bg-green-500' :
                    performance >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(performance, 100)}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-600">{performance.toFixed(1)}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Created Date</label>
              <p className="text-gray-900">{salesman.userId?.createdAt}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Password</label>
              <p className="text-gray-900">{password ? password : <span className="text-gray-400">Not available</span>}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalesmanManagement;