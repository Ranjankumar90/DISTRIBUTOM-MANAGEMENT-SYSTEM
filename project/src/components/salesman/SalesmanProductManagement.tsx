import React, { useState, useEffect } from 'react';
import { Search, Package, AlertTriangle, Calendar, Building2, Filter, Eye } from 'lucide-react';
import { Product, Company } from '../../types';
import { productsAPI, companiesAPI } from '../../services/api';

const SalesmanProductManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'company'>('company');
  const [selectedCompanyView, setSelectedCompanyView] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    productsAPI.getAll().then(res => setProducts(res.data || []));
    companiesAPI.getAll().then(res => setCompanies(res.data || []));
  }, []);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCompany = selectedCompany === 'all' ||
      (typeof product.companyId === 'string'
        ? product.companyId === selectedCompany
        : product.companyId._id === selectedCompany);
    return matchesSearch && matchesCompany && product.isActive;
  });

  const getCompanyName = (companyId: string) => {
    const company = companies.find(c => c._id === companyId);
    return company?.name || 'Unknown';
  };

  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return 'no-expiry';
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 30) return 'expiring-soon';
    if (daysUntilExpiry <= 90) return 'expiring-warning';
    return 'good';
  };

  const getExpiryColor = (status: string) => {
    switch (status) {
      case 'expired': return 'bg-red-100 text-red-800';
      case 'expiring-soon': return 'bg-orange-100 text-orange-800';
      case 'expiring-warning': return 'bg-yellow-100 text-yellow-800';
      case 'good': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStockStatus = (product: Product) => {
    if (product.stock === 0) return 'out-of-stock';
    if (product.stock <= product.minStockLevel) return 'low-stock';
    return 'in-stock';
  };

  const getStockColor = (status: string) => {
    switch (status) {
      case 'out-of-stock': return 'text-red-600';
      case 'low-stock': return 'text-orange-600';
      default: return 'text-green-600';
    }
  };

  const renderCompanyView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies.map((company) => {
          const companyProducts = products.filter(p => p.companyId === company._id && p.isActive);
          const totalStock = companyProducts.reduce((sum, p) => sum + p.stock, 0);
          const lowStockCount = companyProducts.filter(p => p.stock <= p.minStockLevel).length;
          const expiringCount = companyProducts.filter(p => {
            const status = getExpiryStatus(p.batchInfo?.expiryDate);
            return status === 'expiring-soon' || status === 'expired';
          }).length;

          return (
            <div
              key={company._id}
              onClick={() => setSelectedCompanyView(company._id)}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Building2 className="h-8 w-8 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{company.name}</h3>
                    <p className="text-sm text-gray-600">{company.gstNumber}</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Products</p>
                  <p className="font-semibold text-gray-900">{companyProducts.length}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Stock</p>
                  <p className="font-semibold text-gray-900">{totalStock}</p>
                </div>
                <div>
                  <p className="text-gray-600">Low Stock</p>
                  <p className={`font-semibold ${lowStockCount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {lowStockCount}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Expiring</p>
                  <p className={`font-semibold ${expiringCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {expiringCount}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderCompanyProducts = () => {
    const company = companies.find(c => c._id === selectedCompanyView);
    const companyProducts = products.filter(p => p.companyId === selectedCompanyView && p.isActive);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSelectedCompanyView(null)}
              className="text-green-600 hover:text-green-800"
            >
              ← Back to Companies
            </button>
            <div className="flex items-center space-x-2">
              <Building2 className="h-6 w-6 text-green-600" />
              <h3 className="text-xl font-semibold text-gray-900">{company?.name}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {companyProducts
              .filter(product => product.name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((product) => {
                const expiryStatus = getExpiryStatus(product.batchInfo?.expiryDate);
                const stockStatus = getStockStatus(product);
                
                return (
                  <div key={product._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">{product.name}</h4>
                        <p className="text-sm text-gray-600">Per {product.unit}</p>
                      </div>
                      <div className="flex flex-col space-y-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${getStockColor(stockStatus)}`}>
                          {product.stock} units
                        </span>
                        {product.batchInfo?.expiryDate && (
                          <span className={`text-xs px-2 py-1 rounded-full ${getExpiryColor(expiryStatus)}`}>
                            {expiryStatus === 'expired' ? 'Expired' :
                             expiryStatus === 'expiring-soon' ? 'Expiring Soon' :
                             expiryStatus === 'expiring-warning' ? 'Expiring' : 'Good'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">MRP:</span>
                        <span className="font-medium text-gray-900">₹{product.mrp}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Sale Rate:</span>
                        <span className="font-medium text-gray-900">₹{product.saleRate}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">GST:</span>
                        <span className="text-gray-900">{product.gstRate}%</span>
                      </div>
                      {product.batchInfo?.expiryDate && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Expiry:</span>
                          <span className="text-gray-900">{product.batchInfo.expiryDate}</span>
                        </div>
                      )}
                      {product.batchInfo?.batchNumber && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Batch:</span>
                          <span className="text-gray-900">{product.batchInfo.batchNumber}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <button 
                        onClick={() => setSelectedProduct(product)}
                        className="flex-1 text-green-600 hover:text-green-900 text-sm flex items-center justify-center space-x-1"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View Details</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    );
  };

  const renderListView = () => (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="all">All Companies</option>
            {companies.map((company) => (
              <option key={company._id} value={company._id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pricing
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expiry
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Batch
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProducts.map((product) => {
              const expiryStatus = getExpiryStatus(product.batchInfo?.expiryDate);
              const stockStatus = getStockStatus(product);
              
              return (
                <tr key={product._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Package className="h-8 w-8 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">Per {product.unit}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {
                      typeof product.companyId === 'string'
                        ? getCompanyName(product.companyId)
                        : product.companyId.name
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>MRP: ₹{product.mrp}</div>
                      <div>Sale: ₹{product.saleRate}</div>
                      <div>GST: {product.gstRate}%</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <span className={`text-sm font-medium ${getStockColor(stockStatus)}`}>
                        {product.stock}
                      </span>
                      <div className="text-xs text-gray-500">Min: {product.minStockLevel}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {product.batchInfo?.expiryDate ? (
                      <div>
                        <div className="text-sm text-gray-900">{product.batchInfo.expiryDate}</div>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getExpiryColor(expiryStatus)}`}>
                          {expiryStatus === 'expired' ? 'Expired' :
                           expiryStatus === 'expiring-soon' ? 'Expiring Soon' :
                           expiryStatus === 'expiring-warning' ? 'Expiring' : 'Good'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">No expiry</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.batchInfo?.batchNumber || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      onClick={() => setSelectedProduct(product)}
                      className="text-green-600 hover:text-green-900"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
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
        <h2 className="text-2xl font-bold text-gray-900">Product Information</h2>
        <div className="flex space-x-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('company')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'company' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Company View
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'company' && !selectedCompanyView && renderCompanyView()}
      {viewMode === 'company' && selectedCompanyView && renderCompanyProducts()}
      {viewMode === 'list' && renderListView()}

      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          company={companies.find(c => c._id === selectedProduct.companyId)}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
};

const ProductDetailsModal: React.FC<{
  product: Product;
  company?: Company;
  onClose: () => void;
}> = ({ product, company, onClose }) => {
  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return 'no-expiry';
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 30) return 'expiring-soon';
    if (daysUntilExpiry <= 90) return 'expiring-warning';
    return 'good';
  };

  const expiryStatus = getExpiryStatus(product.batchInfo?.expiryDate);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Product Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 text-lg">{product.name}</h4>
            <p className="text-gray-600">{company?.name}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">MRP</label>
              <p className="text-gray-900 font-medium">₹{product.mrp}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Sale Rate</label>
              <p className="text-gray-900 font-medium">₹{product.saleRate}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">GST Rate</label>
              <p className="text-gray-900">{product.gstRate}%</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Unit</label>
              <p className="text-gray-900">{product.unit}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Current Stock</label>
              <p className={`font-medium ${
                product.stock === 0 ? 'text-red-600' :
                product.stock <= product.minStockLevel ? 'text-orange-600' :
                'text-green-600'
              }`}>
                {product.stock} units
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Min Stock Level</label>
              <p className="text-gray-900">{product.minStockLevel}</p>
            </div>
          </div>

          {product.batchInfo?.expiryDate && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Expiry Date</label>
                <p className="text-gray-900">{product.batchInfo.expiryDate}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Status</label>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  expiryStatus === 'expired' ? 'bg-red-100 text-red-800' :
                  expiryStatus === 'expiring-soon' ? 'bg-orange-100 text-orange-800' :
                  expiryStatus === 'expiring-warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {expiryStatus === 'expired' ? 'Expired' :
                   expiryStatus === 'expiring-soon' ? 'Expiring Soon' :
                   expiryStatus === 'expiring-warning' ? 'Expiring' : 'Good'}
                </span>
              </div>
            </div>
          )}

          {(product.batchInfo?.batchNumber || product.batchInfo?.manufacturingDate) && (
            <div className="grid grid-cols-2 gap-4">
              {product.batchInfo?.batchNumber && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Batch Number</label>
                  <p className="text-gray-900">{product.batchInfo?.batchNumber}</p>
                </div>
              )}
              {product.batchInfo?.manufacturingDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Manufacturing Date</label>
                  <p className="text-gray-900">{product.batchInfo?.manufacturingDate}</p>
                </div>
              )}
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

export default SalesmanProductManagement;