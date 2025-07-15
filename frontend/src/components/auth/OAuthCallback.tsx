import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export const OAuthCallback: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleOAuthCallback, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading || isProcessing) {
      return;
    }

    const handleCallback = async () => {
      setIsProcessing(true);
      try {
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const pathParts = window.location.pathname.split("/");
        const provider = pathParts[pathParts.length - 1];

        console.log("OAuth callback params:", {
          code,
          state,
          provider,
          pathname: window.location.pathname,
        });

        if (!code || !state) {
          throw new Error("Missing required OAuth parameters");
        }

        if (!provider || !["google", "github"].includes(provider)) {
          throw new Error(`Invalid OAuth provider: ${provider}`);
        }

        await handleOAuthCallback(provider as "google" | "github", code);
        console.log("OAuth callback successful, navigating to /agents");
        setSuccess(true);
        setTimeout(() => navigate("/chat/agents"), 500);
      } catch (error: any) {
        console.error("OAuth callback failed:", error);
        console.error("Error details:", {
          message: error.message,
          response: error.response,
          status: error.response?.status,
        });
        if (error.response) {
          setError(
            error.response.data?.detail ||
              error.message ||
              "Authentication failed"
          );
        } else {
          setError(error.message || "Authentication failed");
        }
        setTimeout(() => navigate("/auth"), 3000);
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [authLoading]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>

          <p className="text-sm text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">
            Success! Redirecting...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-12 h-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Authentication failed
            </p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>

          <p className="text-xs text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-sm text-muted-foreground">Processing...</p>
      </div>
    </div>
  );
};
