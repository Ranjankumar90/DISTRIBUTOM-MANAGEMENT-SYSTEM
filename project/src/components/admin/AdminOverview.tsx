import React, { useEffect, useState } from 'react';
import { TrendingUp, Users, Package, ShoppingCart, IndianRupee, CalendarDays, AlertCircle } from 'lucide-react';
import { dashboardAPI, collectionsAPI } from '../../services/api';

function getLastNDates(n: number) {
  const dates = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

const AdminOverview: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailyCollections, setDailyCollections] = useState<{ date: string, total: number }[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await dashboardAPI.getAdminDashboard();
        if (res.success && res.data) {
          setStats(res.data);
        } else {
          setError('Failed to load dashboard stats');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    // Fetch last 7 days collection totals
    const fetchDailyCollections = async () => {
      try {
        const dates = getLastNDates(7);
        const promises = dates.map(async (date) => {
          const res = await collectionsAPI.getAll({ status: 'cleared', startDate: date, endDate: date, limit: 1000 });
          const total = Array.isArray(res.data)
            ? res.data.reduce((sum: number, c: any) => sum + (c.amount || 0), 0)
            : 0;
          return { date, total };
        });
        const results = await Promise.all(promises);
        setDailyCollections(results);
      } catch (err) {
        setDailyCollections([]);
      }
    };
    fetchDailyCollections();
  }, []);

  if (loading) {
    return <div className="py-10 text-center text-gray-500">Loading overview...</div>;
  }
  if (error) {
    return <div className="py-10 text-center text-red-600">{error}</div>;
  }
  if (!stats) {
    return null;
  }

  const overview = stats.overview;
  const financial = stats.financial;

  const statCards = [
    { label: 'Total Customers', value: overview.customers.total, icon: Users },
    { label: 'Total Products', value: overview.products.total, icon: Package },
    { label: 'Total Orders', value: overview.orders.total, icon: ShoppingCart },
    { label: 'Revenue', value: `₹${financial.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: IndianRupee },
    { label: 'Total Dues', value: `₹${financial.totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: AlertCircle },
    { label: 'Total Collections', value: `₹${financial.totalCollections.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: CalendarDays },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-3">
        <TrendingUp className="h-8 w-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Admin Overview</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm p-6 flex items-center space-x-4">
            <stat.icon className="h-8 w-8 text-blue-500" />
            <div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-gray-500 text-sm">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <CalendarDays className="h-5 w-5 text-blue-500" />
          <span>Collections (Last 7 Days)</span>
        </h3>
        <div className="flex items-end space-x-2 h-32">
          {dailyCollections.map((col) => (
            <div key={col.date} className="flex flex-col items-center flex-1">
              <div
                className="w-6 rounded-t bg-blue-500"
                style={{ height: `${Math.max(8, col.total / 1000 * 60)}px` }}
                title={`₹${col.total.toLocaleString()}`}
              ></div>
              <div className="text-xs text-gray-500 mt-1">
                {col.date.slice(5)}
              </div>
              <div className="text-xs text-gray-700">₹{col.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-xl">
        <h3 className="text-lg font-semibold text-blue-700 mb-2">Welcome to the Admin Dashboard!</h3>
        <p className="text-gray-700">Here you can manage customers, products, orders, and view business statistics at a glance.</p>
      </div>
    </div>
  );
};

export default AdminOverview; 