import React, { useState, useEffect } from 'react';
import { Plus, Minus, ShoppingCart, Search, Filter } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { productsAPI, companiesAPI, ordersAPI } from '../../services/api';
import { Product, Company, OrderItem } from '../../types';

interface PlaceOrderProps {
  customer: any;
}

const PlaceOrder: React.FC<PlaceOrderProps> = ({ customer }) => {
  if (!customer) return null;
  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [showCart, setShowCart] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantityInputs, setQuantityInputs] = useState<{ [productId: string]: string }>({});

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      productsAPI.getAll(),
      companiesAPI.getAll()
    ])
      .then(([productsData, companiesData]) => {
        setProducts(productsData.data || []);
        setCompanies(companiesData.data || []);
      })
      .catch((err) => setError(err.message || 'Failed to load products/companies'))
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCompany = selectedCompany === 'all' || (typeof product.companyId === 'string' ? product.companyId : (product.companyId as any)._id) === selectedCompany;
    return matchesSearch && matchesCompany && product.isActive;
  });

  const getCompanyName = (companyId: string) => {
    const company = companies.find(c => (typeof c._id === 'string' ? c._id : '') === companyId);
    return company?.name || 'Unknown';
  };

  const addToCart = (product: Product) => {
    const quantity = parseInt(quantityInputs[product._id] || '0') || 0;
    if (quantity <= 0) return;
    const existingItem = cart.find(item => (typeof item.productId === 'string' ? item.productId : (item.productId as any)._id) === (typeof product._id === 'string' ? product._id : ''));
    if (existingItem) {
      updateQuantity((typeof product._id === 'string' ? product._id : ''), quantity);
    } else {
      const newItem: OrderItem = {
        productId: product._id,
        quantity,
        rate: product.saleRate,
        amount: product.saleRate * quantity,
        gstAmount: (product.saleRate * quantity * product.gstRate) / 100,
        discount: 0
      };
      setCart([...cart, newItem]);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => (typeof item.productId === 'string' ? item.productId : (item.productId as any)._id) !== productId));
      return;
    }

    setCart(cart.map(item => {
      if ((typeof item.productId === 'string' ? item.productId : (item.productId as any)._id) === productId) {
        const product = products.find(p => (typeof p._id === 'string' ? p._id : '') === productId);
        const amount = item.rate * quantity;
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
    if (cart.length === 0) return;
    const customerId = customer._id;
    const { totalAmount, gstAmount, netAmount } = getCartTotal();
    setLoading(true);
    setError(null);
    try {
      await ordersAPI.create({
        customerId,
        items: cart,
        totalAmount,
        gstAmount,
        netAmount,
        discountAmount: 0,
        status: 'pending',
        orderDate: new Date().toISOString(),
        createdBy: customer._id // Assuming customer._id is the user creating the order
      });
      alert(`Order placed successfully!\nTotal: ₹${netAmount.toFixed(2)}`);
      setCart([]);
      setShowCart(false);
    } catch (err: any) {
      setError(err.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const { totalAmount, gstAmount, netAmount } = getCartTotal();

  if (loading) {
    return <div className="text-center py-8">Loading products...</div>;
  }
  if (error) {
    return <div className="text-center py-8 text-red-600">{error}</div>;
  }

  const handleQuantityChange = (productId: string, value: string) => {
    setQuantityInputs(inputs => ({
      ...inputs,
      [productId]: formatNumericInput(value)
    }));
  };
  const incrementQuantity = (productId: string) => {
    setQuantityInputs(inputs => {
      const current = parseInt(inputs[productId] || '0', 10);
      return { ...inputs, [productId]: (current + 1).toString() };
    });
  };
  const decrementQuantity = (productId: string) => {
    setQuantityInputs(inputs => {
      const current = parseInt(inputs[productId] || '0', 10);
      return { ...inputs, [productId]: Math.max(current - 1, 0).toString() };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Place New Order</h2>
        <button
          onClick={() => setShowCart(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
        >
          <ShoppingCart className="h-5 w-5" />
          <span>Cart ({cart.length})</span>
        </button>
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
            const cartItem = cart.find(item => (typeof item.productId === 'string' ? item.productId : (item.productId as any)._id) === (typeof product._id === 'string' ? product._id : ''));
            const getExpiryStatus = (expiryDate?: string) => {
              if (!expiryDate) return 'no-expiry';
              const today = new Date();
              const expiry = new Date(expiryDate);
              const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              if (daysUntilExpiry < 0) return 'expired';
              return 'good';
            };
            const expiryStatus = getExpiryStatus((product.batchInfo as any)?.expiryDate);
            return (
              <div key={product._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">{product.name}</h3>
                    <p className="text-sm text-gray-600">{getCompanyName(typeof product.companyId === 'string' ? product.companyId : (product.companyId as any)._id)}</p>
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
                    <span className="text-gray-600">MRP:</span>
                    <span className="line-through text-gray-500">₹{product.mrp}</span>
                  </div>
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
                        onClick={() => updateQuantity((typeof product._id === 'string' ? product._id : ''), cartItem.quantity - 1)}
                        className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center hover:bg-purple-200"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="w-12 text-center border rounded"
                        value={cartItem.quantity}
                        onChange={e => {
                          const val = formatNumericInput(e.target.value);
                          updateQuantity((typeof product._id === 'string' ? product._id : ''), parseInt(val) || 1);
                        }}
                      />
                      <button
                        onClick={() => updateQuantity((typeof product._id === 'string' ? product._id : ''), cartItem.quantity + 1)}
                        className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center hover:bg-purple-200"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="text-sm font-medium text-purple-600">
                      ₹{cartItem.amount.toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-lg font-bold"
                        onClick={() => decrementQuantity(product._id)}
                        disabled={parseInt(quantityInputs[product._id] || '0', 10) <= 0}
                      >
                        -
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="w-12 text-center border rounded"
                        value={quantityInputs[product._id] || '0'}
                        onChange={e => handleQuantityChange(product._id, e.target.value)}
                      />
                      <button
                        type="button"
                        className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-lg font-bold"
                        onClick={() => incrementQuantity(product._id)}
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => addToCart(product)}
                      disabled={product.stock === 0}
                      className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showCart && (
        <CartModal
          cart={cart}
          products={products}
          onClose={() => setShowCart(false)}
          onUpdateQuantity={updateQuantity}
          onPlaceOrder={placeOrder}
          totals={{ totalAmount, gstAmount, netAmount }}
        />
      )}
    </div>
  );
};

function formatNumericInput(value: string) {
  let cleaned = value.replace(/[^0-9]/g, '');
  cleaned = cleaned.replace(/^0+/, '');
  if (cleaned === '') cleaned = '0';
  return cleaned;
}

const CartModal: React.FC<{
  cart: OrderItem[];
  products: Product[];
  onClose: () => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onPlaceOrder: () => void;
  totals: { totalAmount: number; gstAmount: number; netAmount: number };
}> = ({ cart, products, onClose, onUpdateQuantity, onPlaceOrder, totals }) => {
  const getProductName = (productId: string) => {
    const product = products.find(p => (typeof p._id === 'string' ? p._id : '') === productId);
    return product?.name || 'Unknown Product';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Shopping Cart</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Your cart is empty</p>
          </div>
        ) : (
          <>
            <table className="w-full mb-4">
              <thead>
                <tr>
                  <th className="text-left py-2">Product</th>
                  <th className="text-center py-2">Quantity</th>
                  <th className="text-right py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2">{getProductName(typeof item.productId === 'string' ? item.productId : (item.productId as any)._id)}</td>
                    <td className="py-2 text-center">
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={e => onUpdateQuantity(typeof item.productId === 'string' ? item.productId : (item.productId as any)._id, parseInt(formatNumericInput(e.target.value)) || 1)}
                        className="w-8 text-center border rounded"
                      />
                    </td>
                    <td className="py-2 text-right">₹{item.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between items-center mb-4">
              <span className="font-medium">Total Amount:</span>
              <span>₹{totals.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="font-medium">GST:</span>
              <span>₹{totals.gstAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center mb-6">
              <span className="font-bold">Net Amount:</span>
              <span className="font-bold text-purple-600">₹{totals.netAmount.toFixed(2)}</span>
            </div>
            <button
              onClick={onPlaceOrder}
              className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
            >
              Place Order
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PlaceOrder;