import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export const OAuthCallback: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleOAuthCallback } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const provider = window.location.pathname.split("/").pop();

        if (!code || !state || !provider) {
          throw new Error("Missing required OAuth parameters");
        }

        if (!["google", "github"].includes(provider)) {
          throw new Error("Invalid OAuth provider");
        }

        await handleOAuthCallback(provider as "google" | "github", code, state);
        navigate("/agents");
      } catch (error: any) {
        console.error("OAuth callback failed:", error);
        setError(error.message || "Authentication failed");
        setTimeout(() => navigate("/auth"), 3000);
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, navigate, handleOAuthCallback]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-lg">Completing authentication...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">✗</div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">
            Authentication Failed
          </h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Redirecting you back to login...
          </p>
        </div>
      </div>
    );
  }

  return null;
};
