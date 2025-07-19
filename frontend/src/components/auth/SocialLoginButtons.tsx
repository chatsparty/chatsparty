import { useState } from "react";
import { FaGoogle } from "react-icons/fa";
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
    <button
      type="button"
      className="w-full h-14 bg-black dark:bg-white text-white dark:text-black font-normal text-base rounded-lg transition-all duration-200 hover:opacity-80 disabled:opacity-50 flex items-center justify-center space-x-3"
      disabled={socialLoading !== null}
      onClick={() => {
        setSocialLoading("google");
        handleGoogleLogin();
      }}
    >
      {socialLoading === "google" ? (
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white dark:border-black border-t-transparent dark:border-t-transparent"></div>
      ) : (
        <>
          <FaGoogle className="h-5 w-5" />
          <span>Continue with Google</span>
        </>
      )}
    </button>
  );
};

export const SocialLoginButtons: React.FC = () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return <>{clientId && <GoogleLoginButton />}</>;
};
