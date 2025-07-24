import { User, Customer, Salesman, Company, Product, Order, Collection } from '../types';
import { businessProfile } from './businessProfile';

export const users: User[] = [
  {
    id: 'admin-1',
    mobile: '9876543210',
    password: 'admin123',
    role: 'admin',
    name: 'Admin User',
    createdAt: '2024-01-01',
    isActive: true
  }
];

export const customers: Customer[] = [
  {
    id: 'cust-1',
    mobile: '9876543211',
    password: 'cust123',
    role: 'customer',
    name: 'Raj Store',
    createdAt: '2024-01-02',
    createdBy: 'admin-1',
    isActive: true,
    address: '123 Market Street, Mumbai',
    gstNumber: '27ABCDE1234F1Z5',
    creditLimit: 50000,
    outstandingAmount: 15000
  },
  {
    id: 'cust-2',
    mobile: '9876543212',
    password: 'cust456',
    role: 'customer',
    name: 'Sharma General Store',
    createdAt: '2024-01-03',
    createdBy: 'admin-1',
    isActive: true,
    address: '456 Commercial Complex, Delhi',
    creditLimit: 75000,
    outstandingAmount: 25000
  }
];

export const salesmen: Salesman[] = [
  {
    id: 'sales-1',
    mobile: '9876543213',
    password: 'sales123',
    role: 'salesman',
    name: 'Ramesh Kumar',
    createdAt: '2024-01-02',
    createdBy: 'admin-1',
    isActive: true,
    territory: 'Mumbai West',
    targetAmount: 100000,
    achievedAmount: 65000
  },
  {
    id: 'sales-2',
    mobile: '9876543214',
    password: 'sales456',
    role: 'salesman',
    name: 'Suresh Patel',
    createdAt: '2024-01-03',
    createdBy: 'admin-1',
    isActive: true,
    territory: 'Delhi NCR',
    targetAmount: 120000,
    achievedAmount: 80000
  }
];

export const companies: Company[] = [
  {
    id: 'comp-1',
    name: 'Parle Products',
    gstNumber: '24ABCDE1234F1Z5',
    products: []
  },
  {
    id: 'comp-2',
    name: 'Annop Foods',
    gstNumber: '27BCDEF2345G2Z6',
    products: []
  },
  {
    id: 'comp-3',
    name: 'GME Industries',
    gstNumber: '29CDEFG3456H3Z7',
    products: []
  },
  {
    id: 'comp-4',
    name: 'Britannia Industries',
    gstNumber: '29ABCDE4567H4Z8',
    products: []
  },
  {
    id: 'comp-5',
    name: 'ITC Limited',
    gstNumber: '29BCDEF5678H5Z9',
    products: []
  }
];

export const products: Product[] = [
  {
    id: 'prod-1',
    name: 'Parle-G Biscuits 200g',
    companyId: 'comp-1',
    mrp: 25,
    saleRate: 22,
    gstRate: 12,
    stock: 500,
    unit: 'packet',
    isActive: true,
    expiryDate: '2024-12-31',
    batchNumber: 'PG240115',
    manufacturingDate: '2024-01-15',
    minStockLevel: 50
  },
  {
    id: 'prod-2',
    name: 'Parle Krackjack 300g',
    companyId: 'comp-1',
    mrp: 45,
    saleRate: 40,
    gstRate: 12,
    stock: 300,
    unit: 'packet',
    isActive: true,
    expiryDate: '2024-11-30',
    batchNumber: 'KJ240120',
    manufacturingDate: '2024-01-20',
    minStockLevel: 30
  },
  {
    id: 'prod-3',
    name: 'Annop Namkeen Mix 250g',
    companyId: 'comp-2',
    mrp: 60,
    saleRate: 55,
    gstRate: 12,
    stock: 200,
    unit: 'packet',
    isActive: true,
    expiryDate: '2024-10-15',
    batchNumber: 'AN240110',
    manufacturingDate: '2024-01-10',
    minStockLevel: 25
  },
  {
    id: 'prod-4',
    name: 'GME Cooking Oil 1L',
    companyId: 'comp-3',
    mrp: 120,
    saleRate: 110,
    gstRate: 5,
    stock: 150,
    unit: 'bottle',
    isActive: true,
    expiryDate: '2025-06-30',
    batchNumber: 'GME240105',
    manufacturingDate: '2024-01-05',
    minStockLevel: 20
  },
  {
    id: 'prod-5',
    name: 'Parle Monaco Biscuits 200g',
    companyId: 'comp-1',
    mrp: 30,
    saleRate: 27,
    gstRate: 12,
    stock: 400,
    unit: 'packet',
    isActive: true,
    expiryDate: '2024-09-30',
    batchNumber: 'MN240118',
    manufacturingDate: '2024-01-18',
    minStockLevel: 40
  },
  {
    id: 'prod-6',
    name: 'Britannia Good Day Cookies 100g',
    companyId: 'comp-4',
    mrp: 35,
    saleRate: 32,
    gstRate: 12,
    stock: 250,
    unit: 'packet',
    isActive: true,
    expiryDate: '2024-08-15',
    batchNumber: 'GD240112',
    manufacturingDate: '2024-01-12',
    minStockLevel: 30
  },
  {
    id: 'prod-7',
    name: 'ITC Sunfeast Dark Fantasy 300g',
    companyId: 'comp-5',
    mrp: 80,
    saleRate: 75,
    gstRate: 12,
    stock: 180,
    unit: 'packet',
    isActive: true,
    expiryDate: '2024-07-20',
    batchNumber: 'DF240108',
    manufacturingDate: '2024-01-08',
    minStockLevel: 25
  }
];

export const orders: Order[] = [
  {
    id: 'order-1',
    customerId: 'cust-1',
    salesmanId: 'sales-1',
    items: [
      {
        productId: 'prod-1',
        quantity: 20,
        rate: 22,
        amount: 440,
        gstAmount: 52.8
      },
      {
        productId: 'prod-3',
        quantity: 10,
        rate: 55,
        amount: 550,
        gstAmount: 66
      }
    ],
    totalAmount: 990,
    gstAmount: 118.8,
    netAmount: 1108.8,
    status: 'confirmed',
    orderDate: '2024-01-15',
    billNumber: 'INV-2024-001'
  }
];

export const collections: Collection[] = [
  {
    id: 'coll-1',
    customerId: 'cust-1',
    salesmanId: 'sales-1',
    amount: 5000,
    paymentMode: 'cash',
    date: '2024-01-16',
    status: 'cleared'
  }
];

export const ledgerEntries: LedgerEntry[] = [
  {
    id: 'ledger-1',
    customerId: 'cust-1',
    date: '2024-01-15',
    description: 'Order INV-2024-001',
    type: 'debit',
    amount: 1108.8,
    reference: 'order-1',
    createdBy: 'admin-1',
    createdAt: '2024-01-15T10:30:00Z'
  },
  {
    id: 'ledger-2',
    customerId: 'cust-1',
    date: '2024-01-16',
    description: 'Cash Payment',
    type: 'credit',
    amount: 5000,
    reference: 'coll-1',
    createdBy: 'sales-1',
    createdAt: '2024-01-16T14:20:00Z'
  }
];