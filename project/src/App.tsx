import React, { Suspense, lazy, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Header from './components/Header';
import LoadingSpinner from './components/common/LoadingSpinner';
import { healthAPI } from './services/api';

// Lazy load dashboard components for faster initial load
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const CustomerDashboard = lazy(() => import('./components/customer/CustomerDashboard'));
const SalesmanDashboard = lazy(() => import('./components/salesman/SalesmanDashboard'));

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  // Check backend connectivity on app start
  useEffect(() => {
    const checkBackend = async () => {
      try {
        await healthAPI.check();
        setBackendStatus('connected');
      } catch (error) {
        console.error('Backend connectivity error:', error);
        setBackendStatus('error');
      }
    };

    checkBackend();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading application..." />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Show backend error if connection failed
  if (backendStatus === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 text-lg mb-4">
            Unable to connect to server. Please check your internet connection and try again.
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const DashboardComponent = () => {
    switch (user.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'customer':
        return <CustomerDashboard />;
      case 'salesman':
        return <SalesmanDashboard />;
      default:
        return <div>Invalid role</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>
        <Suspense fallback={
          <div className="flex items-center justify-center p-8">
            <LoadingSpinner size="md" text="Loading dashboard..." />
          </div>
        }>
          <DashboardComponent />
        </Suspense>
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;