import React, { useState, useEffect } from 'react';
import { Search, Eye, Download, Filter, Plus, X } from 'lucide-react';
import { Order } from '../../types';
import { ordersAPI, customersAPI, productsAPI, companiesAPI } from '../../services/api';
import GSTBillModal from './GSTBilling';
// @ts-ignore: No types for html2pdf.js
import html2pdf from 'html2pdf.js';
import { useRef } from 'react';
import PDFDocument from 'pdfkit';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import BillExportLayout from './BillExportLayout';

const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOrder, setEditOrder] = useState<any | null>(null);
  const billRef = useRef<HTMLDivElement>(null);
  const [selectedBillOrder, setSelectedBillOrder] = useState<Order | null>(null);
  const [selectedBillCustomer, setSelectedBillCustomer] = useState<any>(null);
  const [shouldExportPDF, setShouldExportPDF] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [orderRes, customerRes, productRes, companyRes] = await Promise.all([
        ordersAPI.getAll(),
        customersAPI.getWithOutstanding(),
        productsAPI.getAll(),
        companiesAPI.getAll()
      ]);
      setOrders(orderRes.data || orderRes || []);
      setCustomers(customerRes.data || customerRes || []);
      setProducts(productRes.data || productRes || []);
      setCompanies(companyRes.data || companyRes || []);
      console.log('Products loaded:', productRes.data || productRes || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load order management data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh when component mounts or when user navigates back to this tab
  useEffect(() => {
    fetchData();
  }, []);

  const filteredOrders = orders.filter((order: any) => {
    const matchesSearch = (order.id || order._id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.billNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getCustomerName = (customerId: any, order?: any) => {
    if (order && order.counterSell && order.counterSellDetails && order.counterSellDetails.name) {
      return order.counterSellDetails.name;
    }
    if (customerId && typeof customerId === 'object') {
      if (customerId.user && typeof customerId.user === 'object') {
        return customerId.user.name || 'Unknown Customer';
      }
      if (customerId.userId && typeof customerId.userId === 'object') {
        return customerId.userId.name || 'Unknown Customer';
      }
      return customerId.name || 'Unknown Customer';
    }
    const customer = (customers as any[]).find((c: any) => c._id === customerId);
    return customer?.user?.name || customer?.name || 'Unknown Customer';
  };

  const getProductName = (productId: any) => {
    // If productId is a populated object
    if (productId && typeof productId === 'object') {
      return productId.name || 'Unknown Product';
    }
    const product = products.find((p: any) => p.id === productId || p._id === productId);
    return product?.name || 'Unknown Product';
  };

  const getCustomerDetails = (customerId: string) => {
    const customer = customers.find((c: any) => c._id === customerId || c.id === customerId);
    // Return customer with proper structure for the bill export
    if (customer) {
      return {
        ...customer,
        name: customer.user?.name || customer.name,
        mobile: customer.user?.mobile || customer.mobile
      };
    }
    return customer;
  };
  const getProductDetails = (productId: string) => {
    return products.find((p: any) => p._id === productId || p.id === productId);
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      const res = await ordersAPI.updateStatus(orderId, newStatus);
      if (res.success) {
        setOrders(orders.map((order: any) =>
          (order._id === orderId) ? res.data : order
        ));
      } else {
        throw new Error(res.message || 'Failed to update status');
      }
    } catch (err: any) {
      alert('Failed to update order status: ' + (err.message || 'Unknown error'));
    }
  };

  const handleEditOrder = (order: any) => {
    setEditOrder(order);
  };
  const handleSaveEditOrder = async (updatedOrder: any) => {
    try {
      // Ensure status is included in the payload
      const payload = { ...updatedOrder, status: updatedOrder.status };
      const res = await ordersAPI.update(updatedOrder._id, payload);
      if (res.success) {
        setOrders(orders.map(o => (o._id === updatedOrder._id) ? res.data : o));
        setEditOrder(null);
      }
    } catch (err: any) {
      alert('Failed to update order: ' + (err.message || 'Unknown error'));
    }
  };

  const exportOrders = () => {
    const csvRows = [
      ['Order ID', 'Customer Name', 'Date', 'Amount', 'Status', 'Bill Number'],
      ...filteredOrders.map(order => [
        order._id,
        getCustomerName(typeof order.customerId === 'object' && order.customerId !== null ? order.customerId : order.customerId, order),
        order.orderDate,
        `₹${order.netAmount.toFixed(2)}`,
        order.status,
        order.billNumber || '-'
      ])
    ];
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "orders_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadBill = (order: any) => {
    let customer = null;
    if (order.counterSell && order.counterSellDetails) {
      customer = order.counterSellDetails;
    } else {
      customer = getCustomerDetails(
        typeof order.customerId === 'object' && order.customerId !== null
          ? order.customerId._id
          : order.customerId
      );
    }
    setSelectedBillOrder(order);
    setSelectedBillCustomer(customer);
    setShouldExportPDF(true); // Trigger PDF export after render
  };

  useEffect(() => {
    const exportPDF = async () => {
      const el = document.getElementById('bill-pdf-export');
      if (el) {
        const canvas = await html2canvas(el, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'pt',
          format: 'a4'
        });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        
        // Generate filename with customer name and date
        const customerName = selectedBillCustomer?.user?.name || selectedBillCustomer?.name || 'Unknown';
        const orderDate = selectedBillOrder?.orderDate ? new Date(selectedBillOrder.orderDate) : new Date();
        const dateStr = orderDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        const sanitizedCustomerName = customerName.replace(/[^a-zA-Z0-9]/g, '_'); // Remove special characters
        const fileName = `Order_Invoice_${sanitizedCustomerName}_${dateStr}.pdf`;
        
        pdf.save(fileName);
      }
    };
    if (shouldExportPDF && selectedBillOrder && selectedBillCustomer) {
      exportPDF();
      setShouldExportPDF(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldExportPDF, selectedBillOrder, selectedBillCustomer]);

  if (loading) {
    return <div className="text-center py-10">Loading order management data...</div>;
  }
  if (error) {
    return <div className="text-center py-10 text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Order Management</h2>
        <button 
          onClick={exportOrders}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center space-x-2"
        >
          <Download className="h-5 w-5" />
          <span>Export Orders</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bill Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order: any) => (
                <tr key={order._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order._id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getCustomerName(typeof order.customerId === 'object' && order.customerId !== null ? order.customerId : order.customerId, order)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.orderDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{order.netAmount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order._id, e.target.value as Order['status'])}
                      className={`text-xs font-medium rounded-full px-2 py-1 border-0 ${
                        order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-red-100 text-red-800'
                      }`}
                      disabled={order.status === 'delivered'}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.billNumber || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="text-orange-600 hover:text-orange-900"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadBill(order)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          getCustomerName={getCustomerName}
          getProductName={getProductName}
          products={products}
          onSave={handleSaveEditOrder}
        />
      )}
      {editOrder && (
        <EditOrderModal
          order={editOrder}
          products={products}
          onClose={() => setEditOrder(null)}
          onSave={handleSaveEditOrder}
        />
      )}
      {/* Add a hidden bill export div for PDF generation */}
      <div
        id="bill-pdf-export"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          width: 794, // A4 width at 96dpi
          minHeight: 1123, // A4 height at 96dpi
          background: '#fff',
          boxSizing: 'border-box',
          zIndex: -1
        }}
      >
        {selectedBillOrder && selectedBillCustomer && (
          <BillExportLayout
            order={selectedBillOrder}
            customer={selectedBillCustomer}
            products={products}
          />
        )}
      </div>
    </div>
  );
};

interface OrderDetailsModalProps {
  order: Order;
  onClose: () => void;
  getCustomerName: (id: any) => string;
  getProductName: (id: string) => string;
  products: any[];
  onSave: (order: any) => void;
}
const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ order, onClose, getCustomerName, getProductName, products, onSave }) => {
  const [editMode, setEditMode] = useState(false);
  const [items, setItems] = useState<OrderItem[]>(order.items.map((item: any) => ({
    ...item,
    productId: typeof item.productId === 'object' && item.productId !== null ? item.productId._id : item.productId
  })));
  const [status, setStatus] = useState<Order['status']>(order.status);
  const [productSearch, setProductSearch] = useState<string[]>(order.items.map(() => ''));

  // Utility to strip leading zeros
  const stripLeadingZeros = (value: string) => value.replace(/^0+(?!$)/, '');

  const handleProductChange = (idx: number, productId: string) => {
    const product = products.find((p: any) => p._id === productId);
    if (product) {
      setItems((items: OrderItem[]) => items.map((item, i) => i === idx ? {
        ...item,
        productId,
        rate: product.saleRate,
        amount: product.saleRate * (item.quantity || 1),
        gstAmount: ((product.saleRate * (item.quantity || 1)) * (product.gstRate || 0) / 100),
      } : item));
    }
  };
  const handleQuantityChange = (idx: number, quantity: string) => {
    const val = stripLeadingZeros(quantity);
    const qty = val === '' ? 1 : parseInt(val, 10);
    const product = products.find((p: any) => p._id === items[idx].productId);
    if (product) {
      setItems((items: OrderItem[]) => items.map((item, i) => i === idx ? {
        ...item,
        quantity: qty,
        amount: product.saleRate * qty,
        gstAmount: (product.saleRate * qty) * (product.gstRate || 0) / 100,
      } : item));
    } else {
      setItems((items: OrderItem[]) => items.map((item, i) => i === idx ? { ...item, quantity: qty } : item));
    }
  };
  const handleRemoveItem = (idx: number) => {
    setItems((items: OrderItem[]) => items.filter((_, i) => i !== idx));
  };
  const handleAddItem = () => {
    setItems((items: OrderItem[]) => [...items, { productId: '', quantity: 1, rate: 0, amount: 0, gstAmount: 0, discount: 0 }]);
  };
  const handleProductSearchChange = (idx: number, value: string) => {
    setProductSearch((prev) => prev.map((v, i) => (i === idx ? value : v)));
  };
  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const gstAmount = items.reduce((sum, item) => sum + (item.gstAmount || 0), 0);
  const netAmount = totalAmount + gstAmount;
  const handleSave = () => {
    onSave({ ...order, items, status, totalAmount, gstAmount, netAmount });
    setEditMode(false);
  };
  const handleCancel = () => {
    setItems(order.items.map((item: any) => ({
      ...item,
      productId: typeof item.productId === 'object' && item.productId !== null ? item.productId._id : item.productId
    })));
    setStatus(order.status);
    setEditMode(false);
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Order Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-500">Order ID</label>
            <p className="text-gray-900">{order._id}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Customer</label>
            <p className="text-gray-900">{getCustomerName(order.customerId)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Order Date</label>
            <p className="text-gray-900">{order.orderDate}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Status</label>
            {editMode ? (
              <select value={status} onChange={e => setStatus(e.target.value as Order['status'])} className="w-full px-3 py-2 border rounded-lg">
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            ) : (
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                'bg-red-100 text-red-800'
              }`}>
                {order.status}
              </span>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-3">Order Items</label>
          <table className="w-full border rounded-lg mb-2" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead className="bg-gray-100">
              <tr>
                <th className="border-b px-2 py-2 text-xs font-medium text-gray-500 uppercase rounded-tl-lg">Product</th>
                <th className="border-b px-2 py-2 text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="border-b px-2 py-2 text-xs font-medium text-gray-500 uppercase">Rate</th>
                <th className="border-b px-2 py-2 text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="border-b px-2 py-2 text-xs font-medium text-gray-500 uppercase rounded-tr-lg"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, idx: number) => {
                const search = productSearch[idx] || '';
                const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
                return (
                  <tr key={idx} className="hover:bg-gray-50 transition-all">
                    <td className="py-2 px-2 align-top w-1/3">
                      {editMode ? (
                        <div className="flex flex-col gap-1">
                          <select value={item.productId} onChange={e => handleProductChange(idx, e.target.value)} className="px-2 py-1 border rounded w-full text-sm">
                            <option value="">Select</option>
                            {(!item.productId || products.some(p => p._id === item.productId))
                              ? null
                              : <option value={item.productId}>
                                  {typeof item.productId === 'object' && item.productId !== null && 'name' in item.productId
                                    ? (item.productId as any).name
                                    : '(Deleted Product)'}
                                </option>}
                            {products.map(p => (
                              <option key={p._id} value={p._id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <span>{getProductName(item.productId)}</span>
                      )}
                    </td>
                    <td className="py-2 px-2 align-top w-1/6">
                      {editMode ? (
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={e => handleQuantityChange(idx, e.target.value)}
                          className="w-16 px-2 py-1 border rounded text-right text-sm"
                        />
                      ) : (
                        <span>{item.quantity}</span>
                      )}
                    </td>
                    <td className="py-2 px-2 align-top w-1/6">₹{item.rate.toFixed(2)}</td>
                    <td className="py-2 px-2 align-top w-1/6">₹{item.amount.toFixed(2)}</td>
                    {editMode && (
                      <td className="py-2 px-2 align-top w-1/6">
                        <button onClick={() => handleRemoveItem(idx)} className="text-xs text-red-500 hover:text-red-700 px-2 py-1 border border-red-200 rounded transition-all">Remove</button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="border-t my-4"></div>
          {editMode && (
            <button onClick={handleAddItem} className="px-3 py-1 bg-blue-100 text-blue-700 rounded">Add Product</button>
          )}
        </div>
        <div className="border-t pt-4 mt-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block font-medium text-gray-500">Total Amount</label>
              <p className="text-gray-900">₹{totalAmount.toFixed(2)}</p>
            </div>
            <div>
              <label className="block font-medium text-gray-500">GST Amount</label>
              <p className="text-gray-900">₹{gstAmount.toFixed(2)}</p>
            </div>
            <div>
              <label className="block font-medium text-gray-900">Net Amount</label>
              <p className="text-lg font-bold text-gray-900">₹{netAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          {editMode ? (
            <>
              {order.status !== 'delivered' && (
                <button onClick={handleSave} className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">Save Changes</button>
              )}
              <button onClick={handleCancel} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</button>
            </>
          ) : (
            order.status !== 'delivered' && (
              <button onClick={() => setEditMode(true)} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Edit</button>
            )
          )}
          <button onClick={onClose} className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800">Close</button>
        </div>
      </div>
    </div>
  );
};

type EditOrderModalProps = {
  order: any;
  products: any[];
  onClose: () => void;
  onSave: (order: any) => void;
};
type OrderItem = {
  productId: string;
  quantity: number;
  rate: number;
  amount: number;
  gstAmount: number;
  discount?: number;
};
const EditOrderModal: React.FC<EditOrderModalProps> = ({ order, products, onClose, onSave }) => {
  const [items, setItems] = useState<OrderItem[]>(order.items.map((item: any) => ({
    ...item,
    productId: typeof item.productId === 'object' && item.productId !== null ? item.productId._id : item.productId
  })));
  const [status, setStatus] = useState(order.status);
  const [billNumber, setBillNumber] = useState(order.billNumber || '');
  const [productSearch, setProductSearch] = useState<string[]>(order.items.map(() => ''));

  // Utility to strip leading zeros
  const stripLeadingZeros = (value: string) => value.replace(/^0+(?!$)/, '');

  const handleItemChange = (idx: number, field: keyof OrderItem, value: any) => {
    setItems((items: OrderItem[]) => items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };
  const handleRemoveItem = (idx: number) => {
    setItems((items: OrderItem[]) => items.filter((_, i) => i !== idx));
  };
  const handleAddItem = () => {
    setItems((items: OrderItem[]) => [...items, { productId: '', quantity: 1, rate: 0, amount: 0, gstAmount: 0, discount: 0 }]);
  };
  const handleProductChange = (idx: number, productId: string) => {
    const product = products.find((p: any) => p._id === productId);
    if (product) {
      setItems((items: OrderItem[]) => items.map((item, i) => i === idx ? {
        ...item,
        productId,
        rate: product.saleRate,
        amount: product.saleRate * (item.quantity || 1),
        gstAmount: ((product.saleRate * (item.quantity || 1)) * (product.gstRate || 0) / 100),
      } : item));
    }
  };
  const handleQuantityChange = (idx: number, quantity: string) => {
    const val = stripLeadingZeros(quantity);
    const qty = val === '' ? 1 : parseInt(val, 10);
    const product = products.find((p: any) => p._id === items[idx].productId);
    if (product) {
      setItems((items: OrderItem[]) => items.map((item, i) => i === idx ? {
        ...item,
        quantity: qty,
        amount: product.saleRate * qty,
        gstAmount: (product.saleRate * qty) * (product.gstRate || 0) / 100,
      } : item));
    } else {
      setItems((items: OrderItem[]) => items.map((item, i) => i === idx ? { ...item, quantity: qty } : item));
    }
  };
  const handleProductSearchChange = (idx: number, value: string) => {
    setProductSearch((prev) => prev.map((v, i) => (i === idx ? value : v)));
  };
  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const gstAmount = items.reduce((sum, item) => sum + (item.gstAmount || 0), 0);
  const netAmount = totalAmount + gstAmount;
  const handleSave = () => {
    onSave({ ...order, items, status, billNumber, totalAmount, gstAmount, netAmount });
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Order Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-3">Order Items</label>
          <table className="w-full border rounded-lg mb-2">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-1 text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-2 py-1 text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-2 py-1 text-xs font-medium text-gray-500 uppercase">Rate</th>
                <th className="px-2 py-1 text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const search = productSearch[idx] || '';
                const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
                return (
                  <tr key={idx}>
                    <td>
                      <div>
                        {/* Removed search product input */}
                        <select value={item.productId} onChange={e => handleProductChange(idx, e.target.value)} className="px-2 py-1 border rounded w-full">
                          <option value="">Select</option>
                          {(!item.productId || products.some(p => p._id === item.productId))
                            ? null
                            : <option value={item.productId}>
                                {typeof item.productId === 'object' && item.productId !== null && 'name' in item.productId
                                  ? (item.productId as any).name
                                  : '(Deleted Product)'}
                              </option>}
                          {filteredProducts.map(p => (
                            <option key={p._id} value={p._id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={e => handleQuantityChange(idx, e.target.value)}
                        className="w-16 px-2 py-1 border rounded text-right"
                      />
                    </td>
                    <td>₹{item.rate.toFixed(2)}</td>
                    <td>₹{item.amount.toFixed(2)}</td>
                    <td><button onClick={() => handleRemoveItem(idx)} className="text-red-600 hover:text-red-900">Remove</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button onClick={handleAddItem} className="px-3 py-1 bg-blue-100 text-blue-700 rounded">Add Product</button>
        </div>
        <div className="border-t pt-4 mt-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block font-medium text-gray-500">Total Amount</label>
              <p className="text-gray-900">₹{totalAmount.toFixed(2)}</p>
            </div>
            <div>
              <label className="block font-medium text-gray-500">GST Amount</label>
              <p className="text-gray-900">₹{gstAmount.toFixed(2)}</p>
            </div>
            <div>
              <label className="block font-medium text-gray-900">Net Amount</label>
              <p className="text-lg font-bold text-gray-900">₹{netAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          {order.status !== 'delivered' && (
            <button onClick={handleSave} className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">Save Changes</button>
          )}
          <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</button>
          <button onClick={onClose} className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800">Close</button>
        </div>
      </div>
    </div>
  );
};

// Add BlueBillModal component
const BlueBillModal: React.FC<{
  order: any;
  customer: any;
  products: any[];
  onClose: () => void;
}> = ({ order, customer, products, onClose }) => {
  const getProduct = (id: string | { _id: string }) => {
    const pid = typeof id === 'object' && id !== null ? id._id : id;
    return products.find((p: any) => p._id === pid || p.id === pid);
  };
  const printBill = () => window.print();
  // Get customer name (handle nested userId)
  const customerName = customer?.userId?.name || customer?.name || 'Unknown Customer';
  // Get customer address (handle nested userId.address or customer.address)
  const customerAddress = customer?.address || customer?.userId?.address || '';
  // Get customer GST number
  const customerGST = customer?.gstNumber || customer?.userId?.gstNumber || 'N/A';
  // Get customer mobile
  const customerMobile = customer?.mobile || customer?.userId?.mobile || '';
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between print:hidden">
          <h3 className="text-lg font-semibold text-gray-900">GST Invoice</h3>
          <div className="flex space-x-3">
            <button
              onClick={printBill}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Print/Download</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="p-0 print:p-0">
          {/* Blue Header */}
          <div style={{ background: '#2563eb', color: 'white', padding: '24px 0', textAlign: 'center' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', letterSpacing: 2 }}>SREE GADI KIRANA STORES</h1>
            <div style={{ fontSize: '1rem', marginTop: 4 }}>GSTIN: YOURGSTIN1234</div>
          </div>
          {/* From/To */}
          <div className="flex justify-between mt-6 px-8">
            <div>
              <b>From:</b><br />
              SREE GADI KIRANA STORES<br />
              Chhauradano, Raxaul, PURAB CHAMPARAN (EAST), Bihar - 845305<br />
              GST No: 10BNHPKS254M1ZD<br />
              Phone: +916204019224<br />
              Email: sreegadikirana@gmail.com
            </div>
            <div>
              <b>Billed To:</b><br />
              {customerName}<br />
              {customerAddress}<br />
              GST No: {customerGST}<br />
              Mobile: {customerMobile}
            </div>
          </div>
          {/* Invoice Details */}
          <div className="flex justify-between mt-6 px-8">
            <div>
              <b>Invoice Details:</b><br />
              Invoice No: {order.billNumber}<br />
              Order No: {order._id}<br />
              Invoice Date: {order.orderDate}<br />
              Status: {order.status}
            </div>
            <div>
              <b>Invoice Date:</b> {order.orderDate}<br />
              <b>Due Date:</b> On Delivery
            </div>
          </div>
          {/* Product Table */}
          <table className="w-full mt-6 mb-2" style={{ borderCollapse: 'collapse' }}>
            <thead style={{ background: '#e5e7eb' }}>
              <tr>
                <th className="border px-2 py-1 text-left">Product</th>
                <th className="border px-2 py-1 text-center">Qty</th>
                <th className="border px-2 py-1 text-center">Rate</th>
                <th className="border px-2 py-1 text-center">GST%</th>
                <th className="border px-2 py-1 text-center">Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item: any, idx: number) => {
                const product = getProduct(item.productId);
                return (
                  <tr key={idx}>
                    <td className="border px-2 py-1">{product?.name || 'Unknown Product'}</td>
                    <td className="border px-2 py-1 text-center">{item.quantity}</td>
                    <td className="border px-2 py-1 text-center">₹{item.rate.toFixed(2)}</td>
                    <td className="border px-2 py-1 text-center">{product?.gstRate ? `${product.gstRate}%` : ''}</td>
                    <td className="border px-2 py-1 text-center">₹{item.amount.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Totals */}
          <div className="flex justify-end mb-6 px-8">
            <div className="w-64">
              <div className="border border-gray-300">
                <div className="flex justify-between px-4 py-2 border-b border-gray-300">
                  <span className="text-sm font-medium">Subtotal:</span>
                  <span className="text-sm">₹{order.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between px-4 py-2 border-b border-gray-300">
                  <span className="text-sm font-medium">Total GST:</span>
                  <span className="text-sm">₹{order.gstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between px-4 py-2 bg-gray-50 font-semibold">
                  <span className="text-sm">Grand Total:</span>
                  <span className="text-sm">₹{order.netAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          {/* Terms and Footer */}
          <div className="text-xs text-gray-600 mb-6 px-8">
            <h4 className="font-semibold mb-2">Terms & Conditions:</h4>
            <ul className="space-y-1">
              <li>• Payment is due within 30 days of invoice date</li>
              <li>• Goods once sold will not be taken back</li>
              <li>• All disputes subject to local jurisdiction</li>
              <li>• This is a computer generated invoice</li>
            </ul>
          </div>
          <div className="text-center text-xs text-gray-500 border-t pt-4">
            <p>Thank you for your business!</p>
            <p>This is a system generated invoice and does not require signature</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderManagement;