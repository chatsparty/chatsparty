import { SocialLoginButtons } from "./SocialLoginButtons";

export const AuthPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-xs space-y-12">
        {/* Logo/Title Section */}
        <div className="text-center space-y-6">
          <h1 className="text-5xl font-light tracking-tight text-black dark:text-white">
            ChatsParty
          </h1>
          <p className="text-lg font-light text-gray-600 dark:text-gray-400">
            Sign in to continue
          </p>
        </div>

        {/* Login Button Section */}
        <div className="space-y-4">
          <SocialLoginButtons />
        </div>

        {/* Footer Links */}
        <div className="text-center pt-8">
          <p className="text-xs text-gray-500 dark:text-gray-500 font-light">
            By continuing, you agree to our{" "}
            <a 
              href="/terms" 
              className="text-gray-700 dark:text-gray-300 hover:underline transition-colors"
            >
              Terms
            </a>{" "}
            and{" "}
            <a 
              href="/privacy" 
              className="text-gray-700 dark:text-gray-300 hover:underline transition-colors"
            >
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
