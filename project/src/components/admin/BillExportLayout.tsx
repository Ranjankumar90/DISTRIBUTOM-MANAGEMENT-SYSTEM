import React from 'react';
import { Download } from 'lucide-react';

const BillExportLayout: React.FC<{
  order: any;
  customer: any;
  products: any[];
}> = ({ order, customer, products }) => {
  const getProduct = (id: string | { _id: string }) => {
    const pid = typeof id === 'object' && id !== null ? id._id : id;
    return products.find((p: any) => p._id === pid || p.id === pid);
  };
  // Get customer name (handle nested userId)
  const customerName = customer?.userId?.name || customer?.name || 'Unknown Customer';
  // Get customer address (handle nested userId.address or customer.address)
  const customerAddress = customer?.address || customer?.userId?.address || '';
  // Get customer GST number
  const customerGST = customer?.gstNumber || customer?.userId?.gstNumber || 'N/A';
  // Get customer mobile
  const customerMobile = customer?.mobile || customer?.userId?.mobile || '';
  return (
    <div style={{ width: 794, minHeight: 1123, background: '#fff', color: '#222', fontFamily: 'sans-serif', padding: 32, boxSizing: 'border-box' }}>
      {/* Blue Header */}
      <div style={{ background: '#2563eb', color: 'white', padding: '24px 0', textAlign: 'center', borderRadius: 8, marginBottom: 24 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', letterSpacing: 2, margin: 0 }}>SREE GADI KIRANA STORES</h1>
        <div style={{ fontSize: '1rem', marginTop: 4 }}>GSTIN: YOURGSTIN1234</div>
      </div>
      {/* From/To */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ flex: 1, marginRight: 32 }}>
          <b>From:</b><br />
          SREE GADI KIRANA STORES<br />
          Chhauradano, Raxaul, PURAB CHAMPARAN (EAST), Bihar - 845305<br />
          GST No: 10BNHPKS254M1ZD<br />
          Phone: +916204019224<br />
          Email: sreegadikirana@gmail.com
        </div>
        <div style={{ flex: 1 }}>
          <b>Billed To:</b><br />
          {customerName}<br />
          {customerAddress}<br />
          GST No: {customerGST}<br />
          Mobile: {customerMobile}
        </div>
      </div>
      {/* Invoice Details Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ flex: 1, marginRight: 32 }}>
          <b>Invoice Details:</b><br />
          Invoice No: {order.billNumber}<br />
          Order No: {order._id}<br />
          Invoice Date: {order.orderDate}<br />
          Status: {order.status}
        </div>
        <div style={{ flex: 1 }}>
          <b>Invoice Date:</b> {order.orderDate}<br />
          <b>Due Date:</b> On Delivery
        </div>
      </div>
      {/* Product Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 0 }}>
        <thead style={{ background: '#e5e7eb' }}>
          <tr>
            <th style={{ border: '1px solid #ccc', padding: 8, textAlign: 'left' }}>Product</th>
            <th style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>Qty</th>
            <th style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>Rate</th>
            <th style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>GST%</th>
            <th style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item: any, idx: number) => {
            const product = getProduct(item.productId);
            return (
              <tr key={idx}>
                <td style={{ border: '1px solid #ccc', padding: 8 }}>{product?.name || 'Unknown Product'}</td>
                <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>₹{item.rate}</td>
                <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>{product?.gstRate ? `${product.gstRate}%` : ''}</td>
                <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>₹{item.amount}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* Totals Box below table */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginBottom: 24, marginTop: 0 }}>
        <div style={{ width: 240, alignSelf: 'flex-start' }}>
          <div style={{ border: '1px solid #ccc', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #ccc' }}>
              <span style={{ fontWeight: 500 }}>Subtotal:</span>
              <span>₹{order.totalAmount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #ccc' }}>
              <span style={{ fontWeight: 500 }}>Total GST:</span>
              <span>₹{order.gstAmount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#f3f4f6', fontWeight: 600 }}>
              <span>Grand Total:</span>
              <span>₹{order.netAmount}</span>
            </div>
          </div>
        </div>
      </div>
      {/* Terms and Footer */}
      <div style={{ fontSize: 12, color: '#666', marginBottom: 24, marginLeft: 4 }}>
        <h4 style={{ fontWeight: 600, marginBottom: 8 }}>Terms & Conditions:</h4>
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          <li>• Payment is due within 30 days of invoice date</li>
          <li>• Goods once sold will not be taken back</li>
          <li>• All disputes subject to local jurisdiction</li>
          <li>• This is a computer generated invoice</li>
        </ul>
      </div>
      <div style={{ textAlign: 'center', fontSize: 12, color: '#888', borderTop: '1px solid #eee', paddingTop: 16, marginLeft: 4 }}>
        <p>Thank you for your business!</p>
        <p>This is a system generated invoice and does not require signature</p>
      </div>
    </div>
  );
};

export default BillExportLayout; 