import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { FileText, Download, Search, Calendar, Filter } from 'lucide-react';
import { ordersAPI, customersAPI, productsAPI, companiesAPI } from '../../services/api';
import { businessProfile } from '../../data/businessProfile';
import { Order } from '../../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const GSTBilling: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
        console.log('Sample customers:', customerRes.data || customerRes || []);
        setProducts(productRes.data || productRes || []);
        setCompanies(companyRes.data || companyRes || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load GST billing data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getCustomerDetails = (customerId: any) => {
    // If customerId is an object, use its _id
    const id = typeof customerId === 'object' && customerId !== null ? customerId._id : customerId;
    return customers.find((c: any) => c.id === id || c._id === id);
  };

  const filteredOrders = orders.filter((order: any) => {
    // Get customer name for search
    let customerName = '';
    if (typeof order.customerId === 'object' && order.customerId !== null) {
      customerName = order.customerId.user?.name || order.customerId.userId?.name || '';
    } else {
      const customer = getCustomerDetails(order.customerId);
      customerName = customer?.user?.name || customer?.userId?.name || customer?.name || '';
    }
    const matchesSearch =
      (order.id || order._id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.billNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = !dateFilter || order.orderDate === dateFilter;
    return matchesSearch && matchesDate && order.status !== 'cancelled';
  });

  const getProductDetails = (productId: string) => {
    return products.find((p: any) => p.id === productId || p._id === productId);
  };

  const generateBill = (order: Order) => {
    setSelectedOrder(order);
  };

  const exportAllBills = () => {
    const csvRows = [
      ['Order ID', 'Customer Name', 'Date', 'Amount', 'GST', 'Total'],
      ...filteredOrders.map(order => {
        const customer = getCustomerDetails(order.customerId);
        return [
          order.id || order._id,
          customer?.user?.name || customer?.userId?.name || '',
          order.orderDate,
          order.totalAmount,
          order.gstAmount,
          order.netAmount
        ].join(',');
      })
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "gst_bills.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div className="text-center py-10">Loading GST billing data...</div>;
  }
  if (error) {
    return <div className="text-center py-10 text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6 print:hidden">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">GST Billing</h2>
        <button onClick={exportAllBills} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
          <Download className="h-5 w-5" />
          <span>Export All Bills</span>
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Details
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
                  GST
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order: any) => {
                let customer = getCustomerDetails(order.customerId);
                if (order.counterSell && order.counterSellDetails) {
                  customer = { name: order.counterSellDetails.name, address: order.counterSellDetails.address };
                }
                return (
                  <tr key={order.id || order._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{order.id || order._id}</div>
                        {order.billNumber && (
                          <div className="text-sm text-gray-500">Bill: {order.billNumber}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {
                            typeof order.customerId === 'object' && order.customerId !== null
                              ? order.customerId.userId?.name
                              : customer?.userId?.name || customer?.name || order.customerId || 'Unknown'
                          }
                        </div>
                        <div className="text-sm text-gray-500">{customer?.gstNumber || 'No GST'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.orderDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{order.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{order.gstAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₹{order.netAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            let customerObj = getCustomerDetails(order.customerId);
                            if (order.counterSell && order.counterSellDetails) {
                              customerObj = { name: order.counterSellDetails.name, address: order.counterSellDetails.address };
                            }
                            setSelectedOrder({ ...order, customer: customerObj });
                          }}
                          className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                        >
                          <FileText className="h-4 w-4" />
                          <span>Generate Bill</span>
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

      {selectedOrder && (
        <GSTBillModal
          order={selectedOrder}
          customer={selectedOrder.counterSell && selectedOrder.counterSellDetails ? { name: selectedOrder.counterSellDetails.name, address: selectedOrder.counterSellDetails.address } : getCustomerDetails(selectedOrder.customerId)}
          getProductDetails={getProductDetails}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
};

const GSTBillModal: React.FC<{
  order: Order;
  customer: any;
  getProductDetails: (id: string) => any;
  onClose: () => void;
}> = ({ order, customer, getProductDetails, onClose }) => {
  const companyDetails = {
    name: businessProfile.businessName,
    address: `${businessProfile.address.street}, ${businessProfile.address.city}, ${businessProfile.address.district}, ${businessProfile.address.state} - ${businessProfile.address.pincode}`,
    gstNumber: businessProfile.gstNumber,
    phone: businessProfile.contactNumber,
    email: businessProfile.email
  };

  const billRef = useRef<any>(null);
  
  // Generate filename with customer name and date
  const generateFileName = () => {
    const customerName = customer?.user?.name || customer?.name || 'Unknown';
    const orderDate = new Date(order.orderDate);
    const dateStr = orderDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    const sanitizedCustomerName = customerName.replace(/[^a-zA-Z0-9]/g, '_'); // Remove special characters
    return `GST_Invoice_${sanitizedCustomerName}_${dateStr}.pdf`;
  };

  const handlePrint = useReactToPrint({
    contentRef: billRef,
    pageStyle: '@media print { body { -webkit-print-color-adjust: exact; } }',
  });

  const handleDownload = async () => {
    if (billRef.current) {
      try {
        // Show loading state
        const downloadBtn = document.querySelector('[data-download-btn]') as HTMLButtonElement;
        if (downloadBtn) {
          downloadBtn.disabled = true;
          downloadBtn.innerHTML = '<span>Generating PDF...</span>';
        }

        // Convert HTML to canvas
        const canvas = await html2canvas(billRef.current, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });

        // Create PDF
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 295; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;

        let position = 0;

        // Add first page
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Add additional pages if needed
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        // Download PDF
        pdf.save(generateFileName().replace('.html', '.pdf'));

        // Reset button
        if (downloadBtn) {
          downloadBtn.disabled = false;
          downloadBtn.innerHTML = '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg><span>Download PDF</span>';
        }
      } catch (error) {
        console.error('PDF generation error:', error);
        alert('Failed to generate PDF. Please try again.');
        
        // Reset button on error
        const downloadBtn = document.querySelector('[data-download-btn]') as HTMLButtonElement;
        if (downloadBtn) {
          downloadBtn.disabled = false;
          downloadBtn.innerHTML = '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg><span>Download PDF</span>';
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 print:hidden">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto print:block print:fixed print:inset-0 print:bg-white print:z-50 print:shadow-none print:rounded-none print:max-w-full print:max-h-full">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between print:hidden">
          <h3 className="text-lg font-semibold text-gray-900">GST Invoice</h3>
          <div className="flex space-x-3">
            <button
              onClick={handleDownload}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              data-download-btn
            >
              <Download className="h-4 w-4" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
        <div ref={billRef} className="p-8 print:p-4 flex flex-col min-h-[100vh] max-w-[800px] mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">TAX INVOICE</h1>
            <p className="text-gray-600">GST Invoice</p>
          </div>
          {/* Company and Customer Details */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">From:</h3>
              <div className="text-sm text-gray-700">
                <p className="font-medium">{companyDetails.name}</p>
                <p>{companyDetails.address}</p>
                <p>GST No: {companyDetails.gstNumber}</p>
                <p>Phone: {companyDetails.phone}</p>
                <p>Email: {companyDetails.email}</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">To:</h3>
              <div className="text-sm text-gray-700">
                <p className="font-medium">{customer?.user?.name || customer?.name || 'Unknown Customer'}</p>
                <p>{customer?.address || ''}</p>
                {customer?.gstNumber && <p>GST No: {customer.gstNumber}</p>}
                <p>Phone: {customer?.user?.mobile || customer?.mobile || ''}</p>
              </div>
            </div>
          </div>
          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <div className="text-sm">
                <p><span className="font-medium">Invoice No:</span> {order.billNumber || order._id}</p>
                <p><span className="font-medium">Order No:</span> {order._id}</p>
              </div>
            </div>
            <div>
              <div className="text-sm">
                <p><span className="font-medium">Invoice Date:</span> {order.orderDate}</p>
                <p><span className="font-medium">Due Date:</span> {order.deliveryDate || 'On Delivery'}</p>
              </div>
            </div>
          </div>
          {/* Items Table */}
          <div className="mb-6">
            <table className="w-full border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    S.No
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Product Name
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    Qty
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Rate
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    GST %
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    GST Amount
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, index) => {
                  const productId = typeof item.productId === 'object' && item.productId !== null ? item.productId._id : item.productId;
                  const product = getProductDetails(productId);
                  return (
                    <tr key={index}>
                      <td className="border border-gray-300 px-4 py-2 text-sm">{index + 1}</td>
                      <td className="border border-gray-300 px-4 py-2 text-sm">{product?.name}</td>
                      <td className="border border-gray-300 px-4 py-2 text-sm text-center">{item.quantity}</td>
                      <td className="border border-gray-300 px-4 py-2 text-sm text-right">₹{item.rate.toFixed(2)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-sm text-right">₹{item.amount.toFixed(2)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-sm text-right">{product?.gstRate}%</td>
                      <td className="border border-gray-300 px-4 py-2 text-sm text-right">₹{item.gstAmount.toFixed(2)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-sm text-right">₹{(item.amount + item.gstAmount).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Totals */}
          <div className="flex justify-end mb-6">
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
          {/* Terms & Conditions and Footer pinned to bottom */}
          <div className="mt-auto flex flex-col gap-2">
            <div className="text-xs text-gray-600 flex-shrink-0">
              <h4 className="font-semibold mb-2">Terms & Conditions:</h4>
              <ul className="space-y-1">
                <li>• Payment is due within 30 days of invoice date</li>
                <li>• Goods once sold will not be taken back</li>
                <li>• All disputes subject to local jurisdiction</li>
                <li>• This is a computer generated invoice</li>
              </ul>
            </div>
            <div className="text-center text-xs text-gray-500 border-t pt-4 flex-shrink-0">
              <p>Thank you for your business!</p>
              <p>This is a system generated invoice and does not require signature</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  };
  
  export default GSTBilling;