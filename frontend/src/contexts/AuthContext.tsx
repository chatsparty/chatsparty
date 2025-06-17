import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthConfig {
  social_auth_only: boolean;
  google_enabled: boolean;
  github_enabled: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  authConfig: AuthConfig | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  loginWithOAuth: (provider: 'google' | 'github') => Promise<void>;
  handleOAuthCallback: (provider: 'google' | 'github', code: string, state: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Configure axios defaults
axios.defaults.baseURL = API_BASE_URL;

// Add axios interceptor to include token in requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add axios interceptor to handle token refresh
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post('/auth/refresh', {
            refresh_token: refreshToken
          });
          
          const { access_token, refresh_token: newRefreshToken } = response.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', newRefreshToken);
          
          // Retry the original request
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return axios(originalRequest);
        } catch (refreshError) {
          // Refresh failed, logout user
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Fetch auth configuration first
        const configResponse = await axios.get('/auth/config');
        setAuthConfig(configResponse.data);
        
        const storedToken = localStorage.getItem('access_token');
        
        if (storedToken) {
          setToken(storedToken);
          try {
            const response = await axios.get('/auth/me');
            setUser(response.data);
          } catch (error) {
            console.error('Failed to fetch user:', error);
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
        }
      } catch (error) {
        console.error('Failed to fetch auth config:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post('/auth/login', {
        email,
        password
      });

      const { access_token, refresh_token } = response.data;
      
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      setToken(access_token);

      // Fetch user data
      const userResponse = await axios.get('/auth/me');
      setUser(userResponse.data);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, firstName?: string, lastName?: string) => {
    try {
      await axios.post('/auth/register', {
        email,
        password,
        first_name: firstName,
        last_name: lastName
      });

      // Auto-login after registration
      await login(email, password);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const loginWithOAuth = async (provider: 'google' | 'github') => {
    try {
      const response = await axios.post('/auth/oauth/init', {
        provider
      });

      const { auth_url, state } = response.data;
      
      // Store state in sessionStorage for validation
      sessionStorage.setItem('oauth_state', state);
      
      // Redirect to OAuth provider
      window.location.href = auth_url;
    } catch (error) {
      console.error('OAuth init failed:', error);
      throw error;
    }
  };

  const handleOAuthCallback = async (provider: 'google' | 'github', code: string, state: string) => {
    try {
      // Validate state
      const storedState = sessionStorage.getItem('oauth_state');
      if (!storedState || storedState !== state) {
        throw new Error('Invalid OAuth state');
      }

      const response = await axios.post(`/auth/oauth/callback/${provider}`, {
        code,
        state
      });

      const { access_token, refresh_token } = response.data;
      
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      setToken(access_token);

      // Clear OAuth state
      sessionStorage.removeItem('oauth_state');

      // Fetch user data
      const userResponse = await axios.get('/auth/me');
      setUser(userResponse.data);
    } catch (error) {
      console.error('OAuth callback failed:', error);
      sessionStorage.removeItem('oauth_state');
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    sessionStorage.removeItem('oauth_state');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    authConfig,
    login,
    register,
    loginWithOAuth,
    handleOAuthCallback,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};