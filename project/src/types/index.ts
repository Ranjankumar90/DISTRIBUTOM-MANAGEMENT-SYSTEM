export interface User {
  _id: string;
  mobile: string;
  password?: string;
  role: 'admin' | 'salesman' | 'customer';
  name: string;
  createdAt: string;
  createdBy?: string;
  isActive: boolean;
  lastLogin?: string;
}

export interface Customer {
  _id: string;
  userId: User;
  address: string;
  gstNumber?: string;
  creditLimit: number;
  outstandingAmount: number;
  territory?: string;
  customerType: 'retail' | 'wholesale' | 'distributor';
  paymentTerms: number;
  availableCredit: number;
}

export interface Salesman {
  _id: string;
  userId: User;
  territory: string;
  targetAmount: number;
  achievedAmount: number;
  commissionRate: number;
  joiningDate: string;
  manager?: string;
  achievementPercentage: number;
}

export interface Company {
  _id: string;
  name: string;
  gstNumber: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  contactInfo?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  isActive: boolean;
  createdBy: string;
}

export interface Product {
  _id: string;
  name: string;
  companyId: Company | string;
  sku?: string;
  mrp: number;
  saleRate: number;
  gstRate: number;
  stock: number;
  unit: string;
  minStockLevel: number;
  maxStockLevel?: number;
  category?: string;
  description?: string;
  batchInfo?: {
    batchNumber?: string;
    manufacturingDate?: string;
    expiryDate?: string;
  };
  /**
   * Expiry date for the product (for direct access in tables)
   */
  expiryDate?: string;
  /**
   * Batch number for the product (for direct access in forms)
   */
  batchNumber?: string;
  /**
   * Manufacturing date for the product (for direct access in forms)
   */
  manufacturingDate?: string;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
  };
  isActive: boolean;
  createdBy: string;
  stockStatus: 'out-of-stock' | 'low-stock' | 'in-stock';
  expiryStatus: 'no-expiry' | 'expired' | 'expiring-soon' | 'expiring-warning' | 'good';
  saleRateExclGST?: number;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customerId: Customer | string;
  salesmanId?: Salesman | string;
  items: OrderItem[];
  totalAmount: number;
  gstAmount: number;
  netAmount: number;
  discountAmount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  orderDate: string;
  deliveryDate?: string;
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  billNumber?: string;
  notes?: string;
  createdBy: string;
}

export interface OrderItem {
  productId: Product | string;
  quantity: number;
  rate: number;
  amount: number;
  gstAmount: number;
  discount: number;
}

export interface Collection {
  _id: string;
  collectionNumber: string;
  customerId: Customer | string;
  salesmanId: Salesman | string;
  amount: number;
  paymentMode: 'cash' | 'cheque' | 'upi' | 'bank_transfer' | 'card';
  paymentDetails?: {
    reference?: string;
    bankName?: string;
    chequeDate?: string;
    clearanceDate?: string;
  };
  collectionDate: string;
  status: 'pending' | 'cleared' | 'bounced' | 'cancelled';
  notes?: string;
  createdBy: string;
}

export interface LedgerEntry {
  _id: string;
  customerId: Customer | string;
  entryDate: string;
  description: string;
  type: 'debit' | 'credit' | 'order' | 'payment' | 'adjustment' | 'opening_balance';
  amount: number;
  reference?: string;
  referenceId?: string;
  referenceModel?: string;
  runningBalance: number;
  createdBy: string;
  createdAt: string;
}

export interface DashboardStats {
  overview: {
    customers?: { total: number; active: number };
    salesmen?: { total: number; active: number };
    products?: { total: number; lowStock: number };
    orders?: { total: number; pending: number; confirmed: number; delivered: number };
    totalOrders?: number;
    pendingOrders?: number;
    deliveredOrders?: number;
    territoryCustomers?: number;
    todayCollections?: number;
  };
  financial?: {
    totalSales: number;
    totalCollections: number;
    totalOutstanding: number;
    totalValue?: number;
    averageOrderValue?: number;
  };
  profile?: {
    name: string;
    territory?: string;
    targetAmount?: number;
    achievedAmount?: number;
    achievementPercentage?: number;
    creditLimit?: number;
    outstandingAmount?: number;
    availableCredit?: number;
    utilizationPercentage?: number;
    mobile?: string;
  };
  monthly?: {
    orders?: number;
    collections?: number;
  };
  recentOrders?: Order[];
  topCustomers?: Customer[];
  monthlyOrders?: any[];
  monthlySales?: any[];
}