import React, { useState, useEffect } from 'react';
import { customersAPI, productsAPI, ordersAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const DirectBill: React.FC = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [newCustomer, setNewCustomer] = useState({ name: '', mobile: '', address: '' });
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [isCounterSell, setIsCounterSell] = useState(false);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    customersAPI.getAll().then(res => setCustomers(res.data || []));
    productsAPI.getAll().then(res => setProducts(res.data || []));
  }, []);

  const handleAddItem = () => {
    setOrderItems([...orderItems, { productId: '', quantity: 1 }]);
  };

  const handleItemChange = (idx: number, field: string, value: any) => {
    const updated = [...orderItems];
    updated[idx][field] = value;
    setOrderItems(updated);
  };

  const handleRemoveItem = (idx: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    let customerId = selectedCustomer || '';
    let counterSellDetails = null;
    try {
      if (isCounterSell) {
        // For counter sell, do not create a customer, just use name/address
        counterSellDetails = {
          name: newCustomer.name,
          address: newCustomer.address,
        };
        customerId = undefined;
      } else if (isNewCustomer) {
        // Ensure password is at least 6 characters
        let password = newCustomer.mobile;
        if (!password || password.length < 6) {
          password = (newCustomer.mobile + '000000').slice(0, 6);
        }
        const res = await customersAPI.create({
          name: newCustomer.name,
          mobile: newCustomer.mobile,
          address: newCustomer.address,
          password,
          creditLimit: 0,
          customerType: 'retail',
          paymentTerms: 30,
        });
        customerId = res.data._id || res.data.id;
      }
      // Prepare order items with all required fields
      const items = orderItems.map(item => {
        const product = products.find(p => p._id === item.productId);
        const rate = product?.saleRate || 0;
        const amount = rate * Number(item.quantity);
        const gstRate = product?.gstRate || 0;
        const gstAmount = amount * gstRate / 100;
        return {
          productId: item.productId,
          quantity: Number(item.quantity),
          rate,
          amount,
          gstAmount,
        };
      });
      const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);
      const gstAmount = items.reduce((sum, i) => sum + i.gstAmount, 0);
      const netAmount = totalAmount + gstAmount;
      const orderPayload: any = {
        items,
        status: 'pending',
        totalAmount,
        gstAmount,
        netAmount,
        createdBy: user?._id,
        ...(isCounterSell ? { counterSell: true, counterSellDetails } : {}),
      };
      if (!isCounterSell && customerId && typeof customerId === 'string' && customerId !== '') {
        orderPayload.customerId = customerId;
      }
      await ordersAPI.create(orderPayload);
      setSuccess('Bill created successfully!');
      setOrderItems([]);
      setSelectedCustomer('');
      setNewCustomer({ name: '', mobile: '', address: '' });
      setIsNewCustomer(false);
      setIsCounterSell(false);
    } catch (err: any) {
      setError(err.backend?.message || err.message || 'Failed to create bill');
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Direct Bill</h2>
      {success && <div className="text-green-600">{success}</div>}
      {error && <div className="text-red-600">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
          <div className="flex items-center space-x-2">
            <select
              value={selectedCustomer}
              onChange={e => {
                setSelectedCustomer(e.target.value);
                setIsNewCustomer(e.target.value === 'new');
                setIsCounterSell(e.target.value === 'counter_sell');
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select Existing Customer</option>
              {customers.map(c => (
                <option key={c._id} value={c._id}>{c.userId?.name} ({c.userId?.mobile})</option>
              ))}
              <option value="new">+ New Customer</option>
              <option value="counter_sell">Counter Sell</option>
            </select>
          </div>
        </div>
        {(isNewCustomer || isCounterSell) && (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Name"
              value={newCustomer.name}
              onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
            {isNewCustomer && (
              <input
                type="text"
                placeholder="Mobile"
                value={newCustomer.mobile}
                onChange={e => setNewCustomer({ ...newCustomer, mobile: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            )}
            <input
              type="text"
              placeholder="Address"
              value={newCustomer.address}
              onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Products</label>
          {orderItems.map((item, idx) => (
            <div key={idx} className="flex items-center space-x-2 mb-2">
              <select
                value={item.productId}
                onChange={e => handleItemChange(idx, 'productId', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
                required
              >
                <option value="">Select Product</option>
                {products.map(p => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
              <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-600">Remove</button>
            </div>
          ))}
          <button type="button" onClick={handleAddItem} className="bg-blue-600 text-white px-3 py-1 rounded">+ Add Product</button>
        </div>
        <button type="submit" className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold">Create Bill</button>
      </form>
    </div>
  );
};

export default DirectBill; 