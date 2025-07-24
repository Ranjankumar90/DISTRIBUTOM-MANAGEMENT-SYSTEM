export const API_BASE_URL = 'http://localhost:5000/api';

const apiRequest = async (endpoint: string, config: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...config.headers as Record<string, string>,
  };
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, { ...config, headers });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const authAPI = {
  login: async (mobile: string, password: string) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ mobile, password }),
    });
  },

  getCurrentUser: async () => {
    return apiRequest('/auth/me');
  },
};

export const productsAPI = {
  getAll: async (params?: any) => {
    const queryParams = new URLSearchParams(params);
    const endpoint = queryParams.toString() ? `/products?${queryParams}` : '/products';
    return apiRequest(endpoint);
  },

  getById: async (id: string) => {
    return apiRequest(`/products/${id}`);
  },

  create: async (productData: any) => {
    return apiRequest('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  },

  update: async (id: string, productData: any) => {
    return apiRequest(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
  },

  remove: async (id: string) => {
    return apiRequest(`/products/${id}`, {
      method: 'DELETE',
    });
  },
};

export const ordersAPI = {
  getAll: async (params?: any) => {
    const queryParams = new URLSearchParams(params);
    const endpoint = queryParams.toString() ? `/orders?${queryParams}` : '/orders';
    return apiRequest(endpoint);
  },

  getById: async (id: string) => {
    return apiRequest(`/orders/${id}`);
  },

  create: async (orderData: any) => {
    return apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },

  update: async (id: string, orderData: any) => {
    return apiRequest(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(orderData),
    });
  },

  updateStatus: async (id: string, status: string) => {
    return apiRequest(`/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
};

export const customersAPI = {
  getAll: async (params?: any) => {
    const queryParams = new URLSearchParams(params);
    const endpoint = queryParams.toString() ? `/customers?${queryParams}` : '/customers';
    return apiRequest(endpoint);
  },

  getById: async (id: string) => {
    return apiRequest(`/customers/${id}`);
  },

  create: async (customerData: any) => {
    return apiRequest('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
  },

  update: async (id: string, customerData: any) => {
    return apiRequest(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customerData),
    });
  },

  remove: async (id: string) => {
    return apiRequest(`/customers/${id}`, {
      method: 'DELETE',
    });
  },

  getOutstanding: async (id: string) => {
    return apiRequest(`/customers/${id}/outstanding`);
  },

  getMe: async () => {
    return apiRequest('/customers/me');
  },
};

export const salesmenAPI = {
  getAll: async (params?: any) => {
    const queryParams = new URLSearchParams(params);
    const endpoint = queryParams.toString() ? `/salesmen?${queryParams}` : '/salesmen';
    return apiRequest(endpoint);
  },

  create: async (salesmanData: any) => {
    return apiRequest('/salesmen', {
      method: 'POST',
      body: JSON.stringify(salesmanData),
    });
  },

  update: async (id: string, salesmanData: any) => {
    return apiRequest(`/salesmen/${id}`, {
      method: 'PUT',
      body: JSON.stringify(salesmanData),
    });
  },

  remove: async (id: string) => {
    return apiRequest(`/salesmen/${id}`, {
      method: 'DELETE',
    });
  },
};

export const companiesAPI = {
  getAll: async (params?: any) => {
    const queryParams = new URLSearchParams(params);
    const endpoint = queryParams.toString() ? `/companies?${queryParams}` : '/companies';
    return apiRequest(endpoint);
  },

  getById: async (id: string) => {
    return apiRequest(`/companies/${id}`);
  },

  create: async (companyData: any) => {
    return apiRequest('/companies', {
      method: 'POST',
      body: JSON.stringify(companyData),
    });
  },

  update: async (id: string, companyData: any) => {
    return apiRequest(`/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(companyData),
    });
  },

  remove: async (id: string) => {
    return apiRequest(`/companies/${id}`, {
      method: 'DELETE',
    });
  },
};

export const collectionsAPI = {
  getAll: async (params?: any) => {
    const queryParams = new URLSearchParams(params);
    const endpoint = queryParams.toString() ? `/collections?${queryParams}` : '/collections';
    return apiRequest(endpoint);
  },

  getById: async (id: string) => {
    return apiRequest(`/collections/${id}`);
  },

  create: async (collectionData: any) => {
    return apiRequest('/collections', {
      method: 'POST',
      body: JSON.stringify(collectionData),
    });
  },
};

export const dashboardAPI = {
  getAdminDashboard: async () => {
    return apiRequest('/dashboard/admin');
  },

  getCustomerDashboard: async () => {
    return apiRequest('/dashboard/customer');
  },

  getSalesmanDashboard: async () => {
    return apiRequest('/dashboard/salesman');
  },
};

export const ledgerAPI = {
  getAll: async (params?: any) => {
    const queryParams = new URLSearchParams(params);
    const endpoint = queryParams.toString() ? `/ledger?${queryParams}` : '/ledger';
    return apiRequest(endpoint);
  },

  create: async (ledgerData: any) => {
    return apiRequest('/ledger', {
      method: 'POST',
      body: JSON.stringify(ledgerData),
    });
  },

  getByCustomer: async (customerId: string) => {
    return apiRequest(`/ledger/customer/${customerId}`);
  },
}; 