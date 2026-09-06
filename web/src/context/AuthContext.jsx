import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getToken, setToken, clearToken } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    try {
      const data = await api('/auth/me');
      setUser(data.user);
      setProfile(data.profile);
    } catch {
      clearToken();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = async (identifier, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { identifier, password }, auth: false });
    setToken(data.token);
    setUser(data.user);
    await loadMe();
    return data.user;
  };

  const registerDonor = async (payload) => {
    const data = await api('/auth/register', { method: 'POST', body: payload, auth: false });
    setToken(data.token);
    setUser(data.user);
    await loadMe();
    return data.user;
  };

  const logout = () => {
    clearToken();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, registerDonor, logout, reload: loadMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);