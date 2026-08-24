import React, { createContext, useState, useEffect, useContext } from 'react';
import { API_URL } from '../config';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('veloop_token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      localStorage.setItem('veloop_token', token);
      fetchUser();
    } else {
      localStorage.removeItem('veloop_token');
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
      } else {
        logout();
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      // Keep user in case of temporary network glitches (Offline mode aware)
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err) {
      console.error(err);
      return { success: false, message: 'Server is unreachable' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, password) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err) {
      console.error(err);
      return { success: false, message: 'Server is unreachable' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('veloop_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      token,
      user,
      loading,
      login,
      register,
      logout,
      fetchUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
