import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, Clock, Plus, Search, User, Phone } from 'lucide-react';
import { customersAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface Visit {
  id: string;
  customerId: string;
  date: string;
  time: string;
  purpose: 'order' | 'collection' | 'follow_up' | 'new_customer';
  notes: string;
  status: 'planned' | 'completed' | 'missed';
}

const CustomerVisits: React.FC = () => {
  const { user } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([
    {
      id: 'visit-1',
      customerId: 'cust-1',
      date: '2024-01-20',
      time: '10:00',
      purpose: 'order',
      notes: 'Monthly order collection',
      status: 'completed'
    },
    {
      id: 'visit-2',
      customerId: 'cust-2',
      date: '2024-01-21',
      time: '14:00',
      purpose: 'collection',
      notes: 'Collect pending payment',
      status: 'planned'
    }
  ]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showAddVisit, setShowAddVisit] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    customersAPI.getAll().then(res => setCustomers(res.data || []));
  }, []);

  const filteredVisits = visits.filter(visit => {
    const customer = customers.find(c => c._id === visit.customerId);
    const matchesSearch = customer?.userId.name.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const matchesStatus = statusFilter === 'all' || visit.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c._id === customerId);
    return customer?.userId.name || 'Unknown Customer';
  };

  const getCustomerDetails = (customerId: string) => {
    return customers.find(c => c._id === customerId);
  };

  const getPurposeColor = (purpose: Visit['purpose']) => {
    switch (purpose) {
      case 'order':
        return 'bg-blue-100 text-blue-800';
      case 'collection':
        return 'bg-green-100 text-green-800';
      case 'follow_up':
        return 'bg-yellow-100 text-yellow-800';
      case 'new_customer':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: Visit['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'planned':
        return 'bg-blue-100 text-blue-800';
      case 'missed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const updateVisitStatus = (visitId: string, status: Visit['status']) => {
    setVisits(visits.map(visit => 
      visit.id === visitId ? { ...visit, status } : visit
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Customer Visits</h2>
        <button
          onClick={() => setShowAddVisit(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Plan Visit</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search visits..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="planned">Planned</option>
              <option value="completed">Completed</option>
              <option value="missed">Missed</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredVisits.map((visit) => {
            const customer = getCustomerDetails(visit.customerId);
            return (
              <div key={visit.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {getCustomerName(visit.customerId)}
                      </h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPurposeColor(visit.purpose)}`}>
                        {visit.purpose.replace('_', ' ')}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(visit.status)}`}>
                        {visit.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{visit.date}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{visit.time}</span>
                      </div>
                      {customer && (
                        <div className="flex items-center space-x-1">
                          <Phone className="h-4 w-4" />
                          <span>{customer.userId.mobile}</span>
                        </div>
                      )}
                    </div>

                    {customer && (
                      <div className="flex items-center space-x-1 text-sm text-gray-600 mb-2">
                        <MapPin className="h-4 w-4" />
                        <span>{customer.address}</span>
                      </div>
                    )}

                    <p className="text-gray-700">{visit.notes}</p>
                  </div>

                  <div className="flex space-x-2 ml-4">
                    {visit.status === 'planned' && (
                      <>
                        <button
                          onClick={() => updateVisitStatus(visit.id, 'completed')}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"
                        >
                          Mark Complete
                        </button>
                        <button
                          onClick={() => updateVisitStatus(visit.id, 'missed')}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                        >
                          Mark Missed
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showAddVisit && (
        <AddVisitModal
          customers={customers}
          onAdd={(visit) => {
            const newVisit: Visit = {
              id: `visit-${Date.now()}`,
              ...visit,
              status: 'planned'
            };
            setVisits([...visits, newVisit]);
            setShowAddVisit(false);
          }}
          onClose={() => setShowAddVisit(false)}
        />
      )}
    </div>
  );
};

const AddVisitModal: React.FC<{
  customers: any[];
  onAdd: (visit: Omit<Visit, 'id' | 'status'>) => void;
  onClose: () => void;
}> = ({ customers, onAdd, onClose }) => {
  const [formData, setFormData] = useState({
    customerId: '',
    date: '',
    time: '',
    purpose: 'order' as Visit['purpose'],
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || !formData.date || !formData.time) return;
    onAdd(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Customer Visit</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer
            </label>
            <select
              required
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Select Customer</option>
              {customers.map((customer) => (
                <option key={customer._id} value={customer._id}>
                  {customer.userId.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time
              </label>
              <input
                type="time"
                required
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purpose
            </label>
            <select
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value as Visit['purpose'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="order">Take Order</option>
              <option value="collection">Collect Payment</option>
              <option value="follow_up">Follow Up</option>
              <option value="new_customer">New Customer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={3}
              placeholder="Visit notes..."
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Plan Visit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerVisits;