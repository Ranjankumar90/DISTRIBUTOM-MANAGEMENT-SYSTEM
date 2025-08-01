export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Simple cache for API responses
const cache = new Map();
const CACHE_DURATION = 60000; // Increased to 1 minute for production

const getCachedResponse = (key: string) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

const setCachedResponse = (key: string, data: any) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
};

// Function to clear cache
export const clearCache = () => {
  cache.clear();
};

// Function to clear specific cache entries
export const clearCacheFor = (pattern: string) => {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
};

const apiRequest = async (endpoint: string, config: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('token');
  
  // Check cache for GET requests
  if (!config.method || config.method === 'GET') {
    const cached = getCachedResponse(url);
    if (cached) {
      return cached;
    }
  }

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // Increased to 20 seconds for production

  try {
    const response = await fetch(url, {
      ...config,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...config.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Cache GET responses
    if (!config.method || config.method === 'GET') {
      setCachedResponse(url, data);
    }
    
    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timeout. Please try again.');
    }
    
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Network error. Please check your connection.');
    }
    
    throw error;
  }
};

export const healthAPI = {
  check: async () => {
    return apiRequest('/health');
  },
};

export const authAPI = {
  login: async (mobile: string, password: string) => {
    // Clear cache on login
    clearCache();
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

  getWithOutstanding: async () => {
    return apiRequest('/customers/with-outstanding');
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

  updateStatus: async (id: string, status: string) => {
    return apiRequest(`/collections/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
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

  update: async (id: string, ledgerData: any) => {
    return apiRequest(`/ledger/${id}`, {
      method: 'PUT',
      body: JSON.stringify(ledgerData),
    });
  },

  delete: async (id: string) => {
    return apiRequest(`/ledger/${id}`, {
      method: 'DELETE',
    });
  },
};

export const visitsAPI = {
  getAll: async (params?: any) => {
    const queryParams = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/visits${queryParams}`);
  },
  create: async (visitData: any) => {
    return apiRequest('/visits', {
      method: 'POST',
      body: JSON.stringify(visitData),
    });
  },
  update: async (id: string, visitData: any) => {
    return apiRequest(`/visits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(visitData),
    });
  },
  remove: async (id: string) => {
    return apiRequest(`/visits/${id}`, {
      method: 'DELETE',
    });
  },
}; 