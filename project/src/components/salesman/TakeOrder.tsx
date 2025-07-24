import React, { useState, useEffect } from 'react';
import { Plus, Minus, ShoppingCart, Search, Filter, User } from 'lucide-react';
import { productsAPI, companiesAPI, customersAPI, ordersAPI } from '../../services/api';
import { Product, OrderItem, Customer } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

console.log('TakeOrder component rendered');

const TakeOrder: React.FC = () => {
  const { user } = useAuth();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    productsAPI.getAll().then(res => setProducts(res.data || []));
    companiesAPI.getAll().then(res => setCompanies(res.data || []));
    customersAPI.getAll().then(res => setCustomers(res.data || []));
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

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.productId === product._id);
    if (existingItem) {
      updateQuantity(product._id, existingItem.quantity + 1);
    } else {
      const newItem: OrderItem = {
        productId: product._id,
        quantity: 1,
        rate: product.saleRate,
        amount: product.saleRate,
        gstAmount: (product.saleRate * product.gstRate) / 100,
        discount: 0
      };
      setCart([...cart, newItem]);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.productId !== productId));
      return;
    }

    setCart(cart.map(item => {
      if (item.productId === productId) {
        const amount = item.rate * quantity;
        const product = products.find(p => p._id === productId);
        const gstAmount = product ? (amount * product.gstRate) / 100 : 0;
        return { ...item, quantity, amount, gstAmount };
      }
      return item;
    }));
  };

  const getCartTotal = () => {
    const totalAmount = cart.reduce((sum, item) => sum + item.amount, 0);
    const gstAmount = cart.reduce((sum, item) => sum + item.gstAmount, 0);
    return { totalAmount, gstAmount, netAmount: totalAmount + gstAmount };
  };

  const placeOrder = async () => {
    console.log('Placing order...');
    if (!selectedCustomer || cart.length === 0) {
      console.log('No customer selected or cart is empty.');
      return;
    }
    const { totalAmount, gstAmount, netAmount } = getCartTotal();
    // Calculate total discountAmount from cart
    const discountAmount = cart.reduce((sum, item) => sum + (item.discount || 0), 0);
    // Ensure all required fields are present in each item
    const items = cart.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount,
      gstAmount: item.gstAmount,
      discount: item.discount || 0
    }));
    try {
      console.log('Order data:', {
        customerId: selectedCustomer._id,
        items,
        totalAmount,
        gstAmount,
        netAmount,
        discountAmount,
        status: 'pending',
        orderDate: new Date().toISOString(),
        createdBy: selectedCustomer.userId._id
      });
      await ordersAPI.create({
        customerId: selectedCustomer._id,
        items,
        totalAmount,
        gstAmount,
        netAmount,
        discountAmount,
        status: 'pending',
        orderDate: new Date().toISOString(),
        createdBy: selectedCustomer.userId._id
      });
      alert(`Order placed successfully for ${selectedCustomer.userId.name}!\nTotal: ₹${netAmount.toFixed(2)}`);
      setCart([]);
      setSelectedCustomer(null);
      // Optionally, refresh the page to reset the form
      window.location.reload();
    } catch (err: any) {
      console.error('Order placement error:', err);
      if (err.backend && err.backend.error) {
        alert('Order placement failed: ' + err.backend.error);
      } else if (err && err.message) {
        alert('Order placement failed: ' + err.message);
      } else {
        alert('Order placement failed. See console for details.');
      }
    }
  };

  const { totalAmount, gstAmount, netAmount } = getCartTotal();

  // Log when the Place Order button will render
  if (cart.length > 0) {
    console.log('Place Order button rendered');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Take Customer Order</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCustomerSelect(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <User className="h-5 w-5" />
            <span>{selectedCustomer ? selectedCustomer.userId.name : 'Select Customer'}</span>
          </button>
          {selectedCustomer && (
            <div className="bg-white border border-gray-300 px-4 py-2 rounded-lg flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5 text-gray-400" />
              <span className="text-gray-700">Cart ({cart.length})</span>
            </div>
          )}
        </div>
      </div>

      {!selectedCustomer ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Customer</h3>
          <p className="text-gray-600 mb-4">Choose a customer to start taking their order</p>
          <button
            onClick={() => setShowCustomerSelect(true)}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
          >
            Select Customer
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">{selectedCustomer.userId.name}</h3>
                <p className="text-sm text-gray-600">{selectedCustomer.address}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Credit Limit: ₹{selectedCustomer.creditLimit}</p>
                <p className="text-sm text-red-600">Outstanding: ₹{selectedCustomer.outstandingAmount}</p>
              </div>
            </div>
          </div>

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
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {filteredProducts.map((product) => {
                const cartItem = cart.find(item => item.productId === product._id);
                const getExpiryStatus = (expiryDate?: string) => {
                  if (!expiryDate) return 'no-expiry';
                  const today = new Date();
                  const expiry = new Date(expiryDate);
                  const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  if (daysUntilExpiry < 0) return 'expired';
                  return 'good';
                };
                
                const expiryStatus = getExpiryStatus(product.batchInfo?.expiryDate);
                
                return (
                  <div key={product._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">{product.name}</h3>
                        <p className="text-sm text-gray-600">{
                          typeof product.companyId === 'string'
                            ? getCompanyName(product.companyId)
                            : product.companyId.name
                        }</p>
                      </div>
                      <div className="flex flex-col space-y-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          product.stock > 50 ? 'bg-green-100 text-green-800' :
                          product.stock > 10 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          Stock: {product.stock}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Sale Rate:</span>
                        <span className="font-medium text-gray-900">₹{product.saleRate}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">GST:</span>
                        <span className="text-gray-900">{product.gstRate}%</span>
                      </div>
                    </div>

                    {cartItem ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateQuantity(product._id, cartItem.quantity - 1)}
                            className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={product.stock}
                            value={cartItem.quantity}
                            onFocus={e => e.target.select()}
                            onChange={e => {
                              let val = parseInt(e.target.value, 10);
                              if (isNaN(val)) val = 1;
                              if (val < 1) val = 1;
                              if (val > product.stock) val = product.stock;
                              updateQuantity(product._id, val);
                            }}
                            className="w-12 text-center border border-gray-300 rounded px-2 py-1 mx-1"
                          />
                          <button
                            onClick={() => updateQuantity(product._id, cartItem.quantity + 1)}
                            className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <span className="text-sm font-medium text-green-600">
                          ₹{cartItem.amount.toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(product)}
                        disabled={product.stock === 0}
                        className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span>{product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {cart.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="text-gray-900">₹{totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">GST:</span>
                  <span className="text-gray-900">₹{gstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold border-t pt-2">
                  <span className="text-gray-900">Total:</span>
                  <span className="text-gray-900">₹{netAmount.toFixed(2)}</span>
                </div>
              </div>
              <button
                onClick={placeOrder}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium"
              >
                Place Order
              </button>
            </div>
          )}
        </>
      )}

      {showCustomerSelect && (
        <CustomerSelectModal
          customers={customers}
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
  customers: Customer[];
  onSelect: (customer: Customer) => void;
  onClose: () => void;
}> = ({ customers, onSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = customers.filter(customer =>
    (customer.userId.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.userId.mobile?.includes(searchTerm))
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Select Customer</h3>
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
            placeholder="Search customers..."
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
                  <h4 className="font-medium text-gray-900">{customer.userId.name}</h4>
                  <p className="text-sm text-gray-600">{customer.address}</p>
                  <p className="text-sm text-gray-600">{customer.userId.mobile}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-gray-600">Credit: ₹{customer.creditLimit}</p>
                  <p className="text-red-600">Outstanding: ₹{customer.outstandingAmount}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TakeOrder;