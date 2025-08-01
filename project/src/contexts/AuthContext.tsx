import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '../types';
import { authAPI } from '../services/api';

interface AuthContextType {
  user: User | null;
  login: (mobile: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch current user from backend with timeout
  const fetchCurrentUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      // Set a timeout for the fetch operation
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000) // Increased to 10 seconds for production
      );
      
      const userPromise = authAPI.getCurrentUser();
      const response = await Promise.race([userPromise, timeoutPromise]) as any;
      
      if (response.success) {
        setUser(response.user);
      } else {
        setUser(null);
        localStorage.removeItem('token');
      }
    } catch (err: any) {
      console.error('Error fetching current user:', err);
      setUser(null);
      localStorage.removeItem('token');
      // Don't show error for initial load, just clear the token
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = useCallback(async (mobile: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Set a timeout for the login operation
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Login timeout. Please try again.')), 15000) // Increased to 15 seconds for production
      );
      
      const loginPromise = authAPI.login(mobile, password);
      const response = await Promise.race([loginPromise, timeoutPromise]) as any;
      
      if (response.success && response.token) {
        localStorage.setItem('token', response.token);
        setUser(response.user);
        setIsLoading(false);
        return true;
      } else {
        setError(response.message || 'Login failed');
        setUser(null);
        setIsLoading(false);
        return false;
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please try again.');
      setUser(null);
      setIsLoading(false);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setError(null);
    localStorage.removeItem('token');
  }, []);

  const contextValue = useMemo(() => ({
    user,
    login,
    logout,
    isLoading,
    error
  }), [user, login, logout, isLoading, error]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};