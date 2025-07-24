import React, { useEffect, useState } from 'react';
import { collectionsAPI } from '../../services/api';

interface Collection {
  _id: string;
  collectionNumber: string;
  customerId: any;
  salesmanId: any;
  amount: number;
  paymentMode: string;
  collectionDate: string;
  status: string;
  notes?: string;
}

const CollectionManagement: React.FC = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCollections = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await collectionsAPI.getAll();
      setCollections(res.data || []);
    } catch (err: any) {
      setError('Failed to fetch collections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const handleAction = async (id: string, status: 'approved' | 'failed') => {
    setLoading(true);
    setError(null);
    try {
      await collectionsAPI.updateStatus(id, status);
      fetchCollections();
    } catch (err: any) {
      setError('Failed to update collection status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Pending Collections Approval</h2>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      <div className="bg-white rounded-xl shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2">Collection #</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Salesman</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Mode</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Notes</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {collections.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-4 text-gray-500">No pending collections</td>
              </tr>
            )}
            {collections.map((col) => (
              <tr key={col._id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{col.collectionNumber}</td>
                <td className="px-4 py-2">{col.customerId?.userId?.name}</td>
                <td className="px-4 py-2">{col.salesmanId?.userId?.name}</td>
                <td className="px-4 py-2">₹{col.amount}</td>
                <td className="px-4 py-2">{col.paymentMode}</td>
                <td className="px-4 py-2">{new Date(col.collectionDate).toLocaleDateString()}</td>
                <td className="px-4 py-2">{col.notes || '-'}</td>
                <td className="px-4 py-2 font-semibold capitalize">{col.status}</td>
                <td className="px-4 py-2 space-x-2">
                  {col.status === 'pending' ? (
                    <>
                      <button
                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                        onClick={() => handleAction(col._id, 'approved')}
                        disabled={loading}
                      >
                        Approve
                      </button>
                      <button
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                        onClick={() => handleAction(col._id, 'failed')}
                        disabled={loading}
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <span className="text-gray-500">No action</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CollectionManagement; 