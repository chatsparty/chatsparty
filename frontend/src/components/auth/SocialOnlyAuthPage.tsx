import { useState } from 'react';
import { FaGoogle, FaGithub } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';

export const SocialOnlyAuthPage: React.FC = () => {
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const { loginWithOAuth, authConfig } = useAuth();

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    setSocialLoading(provider);
    try {
      await loginWithOAuth(provider);
    } catch (error) {
      console.error(`${provider} login failed:`, error);
    } finally {
      setSocialLoading(null);
    }
  };

  if (!authConfig) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-gray-900 dark:border-gray-600 dark:border-t-gray-100"></div>
      </div>
    );
  }

  const enabledProviders = [];
  if (authConfig.google_enabled) {
    enabledProviders.push({
      id: 'google',
      name: 'Continue with Google',
      icon: FaGoogle
    });
  }
  if (authConfig.github_enabled) {
    enabledProviders.push({
      id: 'github',
      name: 'Continue with GitHub',
      icon: FaGithub
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center py-12 px-6">
      <div className="max-w-md w-full">
        
        {/* Main Card */}
        <div className="bg-card border rounded-2xl p-8">
          
          {/* Brand Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-3">
              Chats<span className="text-primary">Party</span>
            </h1>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Sign in to continue
            </h3>
            <p className="text-sm text-muted-foreground">
              Choose your preferred authentication method
            </p>
          </div>

          {/* Social Login Buttons */}
          {enabledProviders.length > 0 ? (
            <div className="space-y-3">
              {enabledProviders.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  disabled={socialLoading !== null}
                  onClick={() => handleSocialLogin(provider.id as 'google' | 'github')}
                  className="w-full flex items-center justify-center py-3 px-4 border border-border text-sm font-medium rounded-lg text-foreground bg-background hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {socialLoading === provider.id ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Connecting...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <provider.icon className="w-4 h-4 mr-3" />
                      {provider.name}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h3 className="text-sm font-medium text-foreground mb-1">
                Authentication unavailable
              </h3>
              <p className="text-sm text-muted-foreground">
                Please check back later
              </p>
            </div>
          )}

          {/* Professional Footer */}
          <div className="mt-8 pt-6 border-t border-border">
            <div className="text-center space-y-4">
              <p className="text-xs text-muted-foreground">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
              <div className="flex items-center justify-center space-x-6 text-xs">
                <button 
                  onClick={() => window.open('/terms', '_blank')}
                  className="text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
                >
                  Terms of Service
                </button>
                <span className="text-border">•</span>
                <button 
                  onClick={() => window.open('/privacy', '_blank')}
                  className="text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
                >
                  Privacy Policy
                </button>
                <span className="text-border">•</span>
                <button 
                  onClick={() => window.open('/support', '_blank')}
                  className="text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
                >
                  Support
                </button>
              </div>
              <div className="flex items-center justify-center text-xs text-muted-foreground">
                <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Protected by enterprise-grade security</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};