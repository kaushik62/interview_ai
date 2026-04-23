import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      verifyToken(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async (authToken) => {
    try {
      // Set the token in api defaults
      api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setToken(null);
      delete api.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Login function - throws error instead of returning object
  const login = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Set default auth header for all future requests
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      
      setToken(data.token);
      setUser(data.user);
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      // THROW the error so component can handle it (especially 429 rate limit)
      throw error;
    }
  };

  // FIXED: Register function - throws error instead of returning object
  const register = async (name, email, password) => {
    try {
      const { data } = await api.post('/auth/register', { name, email, password });
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Set default auth header for all future requests
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      
      setToken(data.token);
      setUser(data.user);
      
      return data;
    } catch (error) {
      console.error('Register error:', error);
      // THROW the error so component can handle it (especially 429 rate limit)
      throw error;
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    delete api.defaults.headers.common['Authorization'];
  }, []);

  // Function to get auth header (useful for manual fetches)
  const getAuthHeader = useCallback(() => {
    const authToken = localStorage.getItem('token');
    return authToken ? { Authorization: `Bearer ${authToken}` } : {};
  }, []);

  // Function to check if user is authenticated
  const isAuthenticated = useCallback(() => {
    return !!localStorage.getItem('token');
  }, []);

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    getAuthHeader,
    isAuthenticated,
    setUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};