import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config/api";

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
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) => Promise<void>;
  loginWithGoogle: (token: string) => Promise<void>;
  loginWithOAuth: (provider: string) => Promise<void>;
  handleOAuthCallback: (provider: string, code: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  authConfig: AuthConfig | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

console.log("API requests are being sent to:", API_BASE_URL);
axios.defaults.baseURL = API_BASE_URL;

const authAxios = axios.create({
  baseURL: API_BASE_URL,
});

axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          const response = await authAxios.post("/api/auth/refresh", {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token: newRefreshToken } =
            response.data;
          localStorage.setItem("access_token", access_token);
          localStorage.setItem("refresh_token", newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return axios(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        setAuthConfig({
          social_auth_only: false,
          google_enabled: false,
          github_enabled: false,
        });

        const storedToken = localStorage.getItem("access_token");

        if (storedToken) {
          setToken(storedToken);
          try {
            const response = await axios.get("/api/auth/me");
            setUser(response.data);
          } catch (error) {
            console.error("Failed to fetch user:", error);
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
          }
        }
      } catch (error) {
        console.error("Failed to initialize auth:", error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post("/api/auth/login", {
        email,
        password,
      });

      const { access_token, refresh_token } = response.data;

      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      setToken(access_token);

      const userResponse = await axios.get("/api/auth/me");
      setUser(userResponse.data);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const register = async (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) => {
    try {
      await axios.post("/api/auth/register", {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      });

      await login(email, password);
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  };

  const loginWithGoogle = async (googleToken: string) => {
    try {
      const response = await axios.post("/api/auth/google", { token: googleToken });

      const { access_token, refresh_token } = response.data;

      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      setToken(access_token);

      const userResponse = await axios.get("/api/auth/me");
      setUser(userResponse.data);
    } catch (error) {
      console.error("Google login failed:", error);
      throw error;
    }
  };

  const loginWithOAuth = async (provider: string) => {
    try {
      window.location.href = `${API_BASE_URL}/auth/${provider}`;
    } catch (error) {
      console.error(`${provider} OAuth login failed:`, error);
      throw error;
    }
  };

  const handleOAuthCallback = async (provider: string, code: string) => {
    try {
      const response = await axios.post(`/api/auth/${provider}/callback`, { code });

      const { access_token, refresh_token } = response.data;

      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      setToken(access_token);

      const userResponse = await axios.get("/api/auth/me");
      setUser(userResponse.data);
    } catch (error) {
      console.error(`${provider} OAuth callback failed:`, error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        loginWithGoogle,
        loginWithOAuth,
        handleOAuthCallback,
        logout,
        loading,
        authConfig,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
