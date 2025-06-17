import { useState } from 'react';
import { Button } from '../ui/button';
import { FaGoogle, FaGithub } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';

interface SocialLoginButtonsProps {
  loading?: boolean;
}

export const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({ 
  loading = false 
}) => {
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
    return null; // Don't render anything while config is loading
  }

  const enabledProviders = [];
  if (authConfig.google_enabled) {
    enabledProviders.push({
      id: 'google',
      name: 'Google',
      icon: FaGoogle
    });
  }
  if (authConfig.github_enabled) {
    enabledProviders.push({
      id: 'github',
      name: 'GitHub',
      icon: FaGithub
    });
  }

  if (enabledProviders.length === 0) {
    return null; // No social providers enabled
  }

  return (
    <div className="space-y-3">
      {!authConfig.social_auth_only && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
      )}

      <div className={`grid gap-3 ${enabledProviders.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {enabledProviders.map((provider) => (
          <Button
            key={provider.id}
            variant="outline"
            type="button"
            disabled={loading || socialLoading !== null}
            onClick={() => handleSocialLogin(provider.id as 'google' | 'github')}
            className="w-full h-11 font-medium transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {socialLoading === provider.id ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Loading...
              </div>
            ) : (
              <div className="flex items-center">
                <provider.icon className="mr-2 h-4 w-4" />
                {provider.name}
              </div>
            )}
          </Button>
        ))}
      </div>
    </div>
  );
};