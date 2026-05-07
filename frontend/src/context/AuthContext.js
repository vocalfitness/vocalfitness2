import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('vf_token'));
  const [loading, setLoading] = useState(true);

  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    const validateToken = async () => {
      if (token) {
        try {
          const response = await axios.get(`${backendUrl}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(response.data);
        } catch (error) {
          console.error('Token validation failed:', error);
          logout();
        }
      }
      setLoading(false);
    };
    validateToken();
  }, [token, backendUrl]);

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${backendUrl}/api/auth/login`, {
        username,
        password
      });
      const { access_token, user: userData } = response.data;
      localStorage.setItem('vf_token', access_token);
      setToken(access_token);
      setUser(userData);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.detail || 'Errore di login';
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('vf_token');
    setToken(null);
    setUser(null);
  };

  const setAuth = (accessToken, userData) => {
    localStorage.setItem('vf_token', accessToken);
    setToken(accessToken);
    setUser(userData);
  };

  const isAdmin = () => user?.role === 'admin';

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    setAuth,
    isAdmin,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
