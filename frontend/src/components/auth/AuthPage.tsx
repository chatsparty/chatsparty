import { useState } from "react";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
import { SocialLoginButtons } from "./SocialLoginButtons";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Separator } from "../ui/separator";

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  const toggleMode = () => {
    setIsLogin(!isLogin);
  };

  // In production, only show a social login card.
  if (import.meta.env.VITE_MODE === "production") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <Card className="border-0 shadow-none sm:border sm:shadow-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">ChatsParty</CardTitle>
              <CardDescription>Sign in to continue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                Choose your preferred authentication method
              </p>
              <SocialLoginButtons />
            </CardContent>
            <CardFooter className="flex flex-col items-center justify-center text-xs text-muted-foreground space-y-4">
              <Separator />
              <span>
                By signing in, you agree to our Terms of Service and Privacy
                Policy
              </span>
              <div className="flex space-x-4">
                <a href="/terms" className="hover:text-primary">
                  Terms of Service
                </a>
                <span>·</span>
                <a href="/privacy" className="hover:text-primary">
                  Privacy Policy
                </a>
                <span>·</span>
                <a href="/support" className="hover:text-primary">
                  Support
                </a>
              </div>
              <span className="flex items-center">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                Protected by enterprise-grade security
              </span>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // In development, show the full login/register forms.
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {isLogin ? (
          <LoginForm onToggleMode={toggleMode} />
        ) : (
          <RegisterForm onToggleMode={toggleMode} />
        )}
      </div>
    </div>
  );
};
