import { useState } from "react";
import { Button } from "../ui/button";
import { FaGoogle, FaGithub } from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";
import { useGoogleLogin } from "@react-oauth/google";

const GoogleLoginButton: React.FC = () => {
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const { loginWithGoogle } = useAuth();

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setSocialLoading("google");
      try {
        await loginWithGoogle(tokenResponse.access_token);
      } catch (error) {
        console.error("Google login failed:", error);
      } finally {
        setSocialLoading(null);
      }
    },
    onError: () => {
      console.error("Google login failed");
      setSocialLoading(null);
    },
  });

  return (
    <Button
      variant="outline"
      type="button"
      className="w-full h-11 font-medium transition-all duration-200"
      disabled={socialLoading !== null}
      onClick={() => {
        setSocialLoading("google");
        handleGoogleLogin();
      }}
    >
      {socialLoading === "google" ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
          Connecting...
        </>
      ) : (
        <>
          <FaGoogle className="mr-2 h-4 w-4" />
          Continue with Google
        </>
      )}
    </Button>
  );
};

export const SocialLoginButtons: React.FC = () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return <div className="space-y-3">{clientId && <GoogleLoginButton />}</div>;
};
