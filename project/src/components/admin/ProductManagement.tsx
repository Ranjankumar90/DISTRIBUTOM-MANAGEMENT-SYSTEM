import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, Calendar, Building2 } from 'lucide-react';
import { Product, Company } from '../../types';
import { productsAPI, companiesAPI } from '../../services/api';

const ProductManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'company'>('list');
  const [selectedCompanyView, setSelectedCompanyView] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  // Fetch products and companies on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [productsResponse, companiesResponse] = await Promise.all([
        productsAPI.getAll({ isActive: 'all' }),
        companiesAPI.getAll({ isActive: 'all' })
      ]);
      
      if (productsResponse.success) {
        setProducts(productsResponse.data);
      }
      
      if (companiesResponse.success) {
        setCompanies(companiesResponse.data);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCompany =
      selectedCompany === 'all' ||
      product.companyId === selectedCompany ||
      (typeof product.companyId === 'object' && product.companyId?._id === selectedCompany);
    return matchesSearch && matchesCompany;
  });

  // Updated getCompanyName to handle both string and object
  const getCompanyName = (companyId: any) => {
    if (typeof companyId === 'object' && companyId !== null) return companyId.name || 'Unknown';
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

  const getStockStatus = (product: Product) => {
    if (product.stock === 0) return 'out-of-stock';
    if (product.stock <= product.minStockLevel) return 'low-stock';
    return 'in-stock';
  };

  const handleAddProduct = async (productData: Partial<Product>) => {
    try {
      // Ensure expiryDate is set at the top level and in batchInfo for backend
      const payload = {
        ...productData,
        expiryDate: productData.expiryDate || (productData.batchInfo && productData.batchInfo.expiryDate) || '',
        batchInfo: {
          batchNumber: productData.batchNumber || (productData.batchInfo && productData.batchInfo.batchNumber) || '',
          manufacturingDate: productData.manufacturingDate || (productData.batchInfo && productData.batchInfo.manufacturingDate) || '',
          expiryDate: productData.expiryDate || (productData.batchInfo && productData.batchInfo.expiryDate) || '',
        },
        companyId: typeof productData.companyId === 'object' && productData.companyId !== null ? productData.companyId._id : String(productData.companyId || '')
      };
      const response = await productsAPI.create(payload);
      if (response.success) {
        setProducts([...products, response.data]);
        setShowAddForm(false);
      }
    } catch (err: any) {
      console.error('Error adding product:', err);
      setError(err.message || 'Failed to add product');
    }
  };

  const handleUpdateProduct = async (id: string, productData: Partial<Product>) => {
    try {
      const response = await productsAPI.update(id, productData);
      if (response.success) {
        setProducts(products.map(p => p._id === id ? response.data : p));
      }
    } catch (err: any) {
      console.error('Error updating product:', err);
      setError(err.message || 'Failed to update product');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      const response = await productsAPI.remove(id);
      if (response.success) {
        setProducts(products.filter(p => p._id !== id));
      }
    } catch (err: any) {
      console.error('Error deleting product:', err);
      setError(err.message || 'Failed to delete product');
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditProduct(product);
    setShowEditForm(true);
  };

  const handleSaveEditProduct = async (id: string, productData: Partial<Product>) => {
    try {
      // Ensure expiryDate is set at the top level and in batchInfo for backend
      const payload = {
        ...productData,
        expiryDate: productData.expiryDate || (productData.batchInfo && productData.batchInfo.expiryDate) || '',
        batchInfo: {
          batchNumber: productData.batchNumber || (productData.batchInfo && productData.batchInfo.batchNumber) || '',
          manufacturingDate: productData.manufacturingDate || (productData.batchInfo && productData.batchInfo.manufacturingDate) || '',
          expiryDate: productData.expiryDate || (productData.batchInfo && productData.batchInfo.expiryDate) || '',
        },
        companyId: typeof productData.companyId === 'object' && productData.companyId !== null ? productData.companyId._id : String(productData.companyId || '')
      };
      const response = await productsAPI.update(id, payload);
      if (response.success) {
        setProducts(products.map(p => p._id === id ? response.data : p));
        setShowEditForm(false);
        setEditProduct(null);
      }
    } catch (err: any) {
      console.error('Error updating product:', err);
      setError(err.message || 'Failed to update product');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Product Management</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading products...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Product Management</h2>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button 
            onClick={fetchData}
            className="ml-2 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Product Management</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'company' : 'list')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2"
          >
            <Building2 className="h-4 w-4" />
            <span>{viewMode === 'list' ? 'Company View' : 'List View'}</span>
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      {viewMode === 'list' ? (
        <>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Companies</option>
                {companies.map(company => (
                  <option key={company._id} value={company._id}>
                    {company.name}
                  </option>
                ))}
              </select>
              <div className="flex space-x-2">
                <span className="text-sm text-gray-600 self-center">Stock Status:</span>
                <div className="flex space-x-1">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {products.filter(p => getStockStatus(p) === 'out-of-stock').length} Out
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    {products.filter(p => getStockStatus(p) === 'low-stock').length} Low
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {products.filter(p => getStockStatus(p) === 'in-stock').length} In
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Products List (already present) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expiry
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((product) => (
                    <tr key={product._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Package className="h-8 w-8 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">{product.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getCompanyName(product.companyId as string)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{product.stock} {product.unit}</div>
                        <div className="text-sm text-gray-500">Min: {product.minStockLevel}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">₹{product.saleRate}</div>
                        <div className="text-sm text-gray-500">MRP: ₹{product.mrp}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          getStockStatus(product) === 'out-of-stock' ? 'bg-red-100 text-red-800' :
                          getStockStatus(product) === 'low-stock' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {getStockStatus(product)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {/* Expiry Status */}
                        {(() => {
                          const expiry = product.expiryDate || (product.batchInfo && product.batchInfo.expiryDate);
                          const status = getExpiryStatus(expiry);
                          const dateStr = expiry ? new Date(expiry).toLocaleDateString() : '';
                          if (status === 'expired')
                            return <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Expired{dateStr && ` (${dateStr})`}</span>;
                          if (status === 'expiring-soon')
                            return <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Expiring Soon{dateStr && ` (${dateStr})`}</span>;
                          if (status === 'expiring-warning')
                            return <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">Expiring Warning{dateStr && ` (${dateStr})`}</span>;
                          if (status === 'good')
                            return <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Good{dateStr && ` (${dateStr})`}</span>;
                          return <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">No Expiry</span>;
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        // Company View
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          {!selectedCompanyView ? (
            <div>
              <h3 className="text-lg font-semibold mb-4">Select a Company</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {companies.map(company => (
                  <div
                    key={company._id}
                    className="cursor-pointer p-4 border rounded-lg hover:bg-gray-100"
                    onClick={() => setSelectedCompanyView(company._id)}
                  >
                    <div className="font-bold text-gray-900">{company.name}</div>
                    <div className="text-sm text-gray-600">GST: {company.gstNumber}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <button
                className="mb-4 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                onClick={() => setSelectedCompanyView(null)}
              >
                ← Back to Companies
              </button>
              <h3 className="text-lg font-semibold mb-4">
                Products for {getCompanyName(selectedCompanyView)}
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.filter(
                      p =>
                        p.companyId === selectedCompanyView ||
                        (typeof p.companyId === 'object' && p.companyId?._id === selectedCompanyView)
                    ).map(product => (
                      <tr key={product._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Package className="h-8 w-8 text-gray-400 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{product.name}</div>
                              <div className="text-sm text-gray-500">{product.sku}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{product.stock} {product.unit}</div>
                          <div className="text-sm text-gray-500">Min: {product.minStockLevel}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">₹{product.saleRate}</div>
                          <div className="text-sm text-gray-500">MRP: ₹{product.mrp}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            getStockStatus(product) === 'out-of-stock' ? 'bg-red-100 text-red-800' :
                            getStockStatus(product) === 'low-stock' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {getStockStatus(product)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {/* Expiry Status */}
                          {(() => {
                            const expiry = product.expiryDate || (product.batchInfo && product.batchInfo.expiryDate);
                            const status = getExpiryStatus(expiry);
                            const dateStr = expiry ? new Date(expiry).toLocaleDateString() : '';
                            if (status === 'expired')
                              return <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Expired{dateStr && ` (${dateStr})`}</span>;
                            if (status === 'expiring-soon')
                              return <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Expiring Soon{dateStr && ` (${dateStr})`}</span>;
                            if (status === 'expiring-warning')
                              return <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">Expiring Warning{dateStr && ` (${dateStr})`}</span>;
                            if (status === 'good')
                              return <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Good{dateStr && ` (${dateStr})`}</span>;
                            return <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">No Expiry</span>;
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {/* Handle edit */}}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product._id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {showAddForm && (
        <AddProductModal
          onClose={() => setShowAddForm(false)}
          onAdd={handleAddProduct}
          companies={companies}
        />
      )}
      {showEditForm && editProduct && (
        <AddProductModal
          onClose={() => { setShowEditForm(false); setEditProduct(null); }}
          onAdd={(data) => handleSaveEditProduct(editProduct._id, data)}
          companies={companies}
          preSelectedCompany={editProduct.companyId && typeof editProduct.companyId === 'object' ? editProduct.companyId._id : (editProduct.companyId as string)}
          initialData={editProduct}
          isEdit
        />
      )}
    </div>
  );
};

const AddProductModal: React.FC<{
  onClose: () => void;
  onAdd: (product: Partial<Product>) => void;
  companies: Company[];
  preSelectedCompany?: string | null;
  initialData?: Partial<Product>;
  isEdit?: boolean;
}> = ({ onClose, onAdd, companies, preSelectedCompany, initialData, isEdit }) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    companyId: typeof (preSelectedCompany || initialData?.companyId) === 'object'
      ? ((preSelectedCompany || (initialData?.companyId as any))?._id || '')
      : String(preSelectedCompany || initialData?.companyId || ''),
    mrp: initialData?.mrp || 0,
    saleRate: initialData?.saleRate || 0,
    gstRate: initialData?.gstRate || 0,
    gstIncludedRate: '',
    stock: initialData?.stock || 0,
    unit: initialData?.unit || '',
    expiryDate: initialData?.expiryDate || (initialData?.batchInfo?.expiryDate || ''),
    batchNumber: initialData?.batchInfo?.batchNumber || '',
    manufacturingDate: initialData?.batchInfo?.manufacturingDate || '',
    minStockLevel: initialData?.minStockLevel || 10
  });
  // Track if user has manually edited saleRate
  const [saleRateManuallyEdited, setSaleRateManuallyEdited] = useState(false);

  // Auto-calculate saleRate when gstIncludedRate or gstRate changes, unless user manually edited saleRate
  useEffect(() => {
    if (!saleRateManuallyEdited && formData.gstIncludedRate && formData.gstRate) {
      const included = parseFloat(formData.gstIncludedRate);
      const gst = parseFloat(formData.gstRate.toString());
      if (!isNaN(included) && !isNaN(gst) && gst >= 0) {
        const sale = included / (1 + gst / 100);
        setFormData(f => ({ ...f, saleRate: Math.round(sale * 100) / 100 }));
      }
    }
  }, [formData.gstIncludedRate, formData.gstRate]);

  // Utility to strip leading zeros and non-numeric chars
  const stripLeadingZeros = (value: string) => value.replace(/^0+(?!$)/, '');
  const onlyNumbers = (value: string) => value.replace(/[^0-9.]/g, '');

  const handleSaleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSaleRateManuallyEdited(true);
    const val = stripLeadingZeros(onlyNumbers(e.target.value));
    setFormData({ ...formData, saleRate: val === '' ? 0 : parseFloat(val) });
  };

  const handleGstIncludedRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSaleRateManuallyEdited(false);
    setFormData({ ...formData, gstIncludedRate: stripLeadingZeros(onlyNumbers(e.target.value)) });
  };

  const handleGstRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSaleRateManuallyEdited(false);
    const val = stripLeadingZeros(onlyNumbers(e.target.value));
    setFormData({ ...formData, gstRate: val === '' ? 0 : parseFloat(val) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { gstIncludedRate, ...rest } = formData;
    onAdd(rest);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{isEdit ? 'Edit Product' : 'Add New Product'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company
              </label>
              <select
                required
                value={formData.companyId}
                onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Select Company</option>
                {companies.map((company) => (
                  <option key={company._id} value={company._id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit
              </label>
              <input
                type="text"
                required
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="e.g., packet, bottle, kg"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                MRP
              </label>
              <input
                type="text"
                required
                value={formData.mrp === 0 ? '' : formData.mrp}
                onChange={(e) => {
                  const val = stripLeadingZeros(onlyNumbers(e.target.value));
                  setFormData({ ...formData, mrp: val === '' ? 0 : parseFloat(val) });
                }}
                inputMode="decimal"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GST Included Rate
              </label>
              <input
                type="text"
                value={formData.gstIncludedRate}
                onChange={handleGstIncludedRateChange}
                placeholder="Enter price incl. GST"
                inputMode="decimal"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GST Rate (%)
              </label>
              <input
                type="text"
                required
                value={formData.gstRate === 0 ? '' : formData.gstRate}
                onChange={handleGstRateChange}
                inputMode="decimal"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sale Rate (Excl. GST)
              </label>
              <input
                type="text"
                required
                value={formData.saleRate === 0 ? '' : formData.saleRate}
                onChange={handleSaleRateChange}
                inputMode="decimal"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock Quantity
              </label>
              <input
                type="text"
                required
                value={formData.stock === 0 ? '' : formData.stock}
                onChange={(e) => {
                  const val = stripLeadingZeros(onlyNumbers(e.target.value));
                  setFormData({ ...formData, stock: val === '' ? 0 : parseInt(val) });
                }}
                inputMode="numeric"
                pattern="[0-9]*"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Stock Level
              </label>
              <input
                type="text"
                value={formData.minStockLevel === 0 ? '' : formData.minStockLevel}
                onChange={(e) => {
                  const val = stripLeadingZeros(onlyNumbers(e.target.value));
                  setFormData({ ...formData, minStockLevel: val === '' ? 0 : parseInt(val) });
                }}
                inputMode="numeric"
                pattern="[0-9]*"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Manufacturing Date
              </label>
              <input
                type="date"
                value={formData.manufacturingDate}
                onChange={(e) => setFormData({ ...formData, manufacturingDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch Number
              </label>
              <input
                type="text"
                value={formData.batchNumber}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
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
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              {isEdit ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductManagement;