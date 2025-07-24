import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Building2, Package, Eye } from 'lucide-react';
import { Company } from '../../types';
import { companiesAPI } from '../../services/api';

const CompanyManagement: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await companiesAPI.getAll();
      setCompanies(response.data);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const handleAddCompany = async (companyData: Partial<Company>) => {
    try {
      const payload = {
        name: companyData.name!,
        gstNumber: companyData.gstNumber!,
        address: {
          city: '',
          state: '',
          country: ''
        },
        contactInfo: {
          email: 'example@example.com',
          phone: '0000000000'
        }
      };

      const response = await companiesAPI.create(payload);
      setCompanies([...companies, response.data]);
      setShowAddForm(false);
    } catch (err) {
      console.error('Add company failed:', err);
      alert('Error while adding company. Check console.');
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    try {
      await companiesAPI.remove(companyId);
      setCompanies(companies.filter((c) => c._id !== companyId));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleEditCompany = (company: Company) => {
    setShowEditForm(true);
    setSelectedCompany(company);
  };

  const handleViewCompany = (company: Company) => {
    setShowEditForm(false);
    setSelectedCompany(company);
  };

  const handleSaveEditCompany = async (id: string, companyData: Partial<Company>) => {
    try {
      await companiesAPI.update(id, companyData);
      await fetchCompanies();
      setShowEditForm(false);
      setSelectedCompany(null);
    } catch (err) {
      console.error('Edit company failed:', err);
      alert('Error while editing company. Check console.');
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.gstNumber.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Company Management</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Add Company</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          {filteredCompanies.map((company) => (
            <div key={company._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Building2 className="h-8 w-8 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{company.name}</h3>
                    <p className="text-sm text-gray-600">{company.gstNumber}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleViewCompany(company)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleEditCompany(company)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCompany(company._id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Address</p>
                  <p className="font-semibold text-gray-900">
                    {typeof company.address === 'object'
                      ? `${company.address.city || ''}, ${company.address.state || ''}, ${company.address.country || ''}`.replace(/^,\s*|,\s*$/, '') || 'N/A'
                      : company.address || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Phone</p>
                  <p className="font-semibold text-gray-900">{company.contactInfo?.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Email</p>
                  <p className="font-semibold text-gray-900">{company.contactInfo?.email || 'N/A'}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Package className="h-4 w-4" />
                  <span>Manage products in Product Management</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAddForm && (
        <AddCompanyModal
          onClose={() => setShowAddForm(false)}
          onAdd={handleAddCompany}
        />
      )}
      {showEditForm && selectedCompany && (
        <AddCompanyModal
          onClose={() => { setShowEditForm(false); setSelectedCompany(null); }}
          onAdd={(data) => handleSaveEditCompany(selectedCompany._id, data)}
          initialData={selectedCompany}
          isEdit
        />
      )}
      {!showEditForm && selectedCompany && (
        <CompanyDetailsModal
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
        />
      )}
    </div>
  );
};

const AddCompanyModal: React.FC<{
  onClose: () => void;
  onAdd: (company: Partial<Company>) => void;
  initialData?: Partial<Company>;
  isEdit?: boolean;
}> = ({ onClose, onAdd, initialData, isEdit }) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    gstNumber: initialData?.gstNumber || ''
  });

  function stripLeadingZeros(value: string) {
    return value.replace(/^0+(?!$)/, '');
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.gstNumber) return;
    onAdd(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{isEdit ? 'Edit Company' : 'Add New Company'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter company name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
            <input
              type="text"
              required
              value={formData.gstNumber}
              onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter GST number"
            />
          </div>
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >Cancel</button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {isEdit ? 'Save Changes' : 'Add Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CompanyDetailsModal: React.FC<{
  company: Company;
  onClose: () => void;
}> = ({ company, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Details</h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700">Name:</p>
            <p className="font-semibold text-gray-900">{company.name}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">GST Number:</p>
            <p className="font-semibold text-gray-900">{company.gstNumber}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Address:</p>
            <p className="font-semibold text-gray-900">
              {typeof company.address === 'object'
                ? `${company.address.city || ''}, ${company.address.state || ''}, ${company.address.country || ''}`.replace(/^,\s*|,\s*$/, '') || 'N/A'
                : company.address || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Contact Info:</p>
            <p className="font-semibold text-gray-900">
              Email: {company.contactInfo?.email || 'N/A'}, Phone: {company.contactInfo?.phone || 'N/A'}
            </p>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyManagement;