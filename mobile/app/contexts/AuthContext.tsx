import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:4000';
  const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

  // Complete auth session handling after browser redirects
  WebBrowser.maybeCompleteAuthSession();

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('access_token');
      if (storedToken) {
        setToken(storedToken);
        await fetchUserData(storedToken);
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserData = async (authToken: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        // Token might be invalid, clear it
        await logout();
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      await logout();
    }
  };

  const loginWithGoogle = async () => {
    try {
      setIsLoading(true);
      
      if (!GOOGLE_CLIENT_ID) {
        throw new Error('Google Client ID not configured. Please add EXPO_PUBLIC_GOOGLE_CLIENT_ID to your .env file.');
      }

      console.log('🔐 Starting Google OAuth authentication...');

      // Generate the redirect URI that needs to be added to Google Console
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'chatsparty',
      });

      console.log('🔗 IMPORTANT: Add this redirect URI to Google Console:');
      console.log('📋 Redirect URI:', redirectUri);
      console.log('📋 Google Client ID:', GOOGLE_CLIENT_ID);

      // Step 1: Get authorization code using proper OAuth 2.0 Authorization Code Flow
      const request = new AuthSession.AuthRequest({
        clientId: GOOGLE_CLIENT_ID,
        scopes: ['openid', 'profile', 'email'],
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
        state: Math.random().toString(36).substring(7), // Random state for security
      });

      const result = await request.promptAsync({
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      });

      console.log('OAuth result:', result.type);

      if (result.type !== 'success') {
        throw new Error(`Authentication ${result.type}`);
      }

      const { code } = result.params;
      if (!code) {
        throw new Error('No authorization code received');
      }

      console.log('✅ Got authorization code, exchanging for access token...');

      // Step 2: Exchange authorization code for access token
      // Note: For mobile apps, this requires the Google OAuth client to be configured as a "public" client
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'chatsparty',
      });

      console.log('Using redirect URI for token exchange:', redirectUri);

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          // Note: client_secret is not included for mobile/public clients
        }).toString(),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error}`);
      }

      const tokenData = await tokenResponse.json();
      const { access_token } = tokenData;

      if (!access_token) {
        throw new Error('No access token received from Google');
      }

      console.log('✅ Got Google access token, sending to backend...');

      // Step 3: Send Google access token to backend (exactly like frontend)
      const response = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: access_token,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Backend authentication failed');
      }

      const authData = await response.json();
      const { access_token: appToken, refresh_token, user: userData } = authData;

      // Step 4: Store tokens and update state (exactly like frontend)
      await AsyncStorage.setItem('access_token', appToken);
      if (refresh_token) {
        await AsyncStorage.setItem('refresh_token', refresh_token);
      }

      setToken(appToken);
      setUser(userData);
      
      console.log('✅ Authentication complete! Welcome', userData.name || userData.email);
      
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Clear stored tokens
      await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
      
      // Clear state
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isAuthenticated = !!user && !!token;

  const contextValue = {
    user,
    token,
    isAuthenticated,
    isLoading,
    loginWithGoogle,
    logout,
  };

  // AuthContext is ready with all functions

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};