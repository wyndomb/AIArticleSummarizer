import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/lib/supabase";
import { FcGoogle } from "react-icons/fc";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface LoginButtonProps {
  provider?: string;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "primary";
}

export function LoginButton({
  provider = "google",
  className = "",
  variant = "outline",
}: LoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [location] = useLocation();

  // Check for forcedLogout parameter
  const isForcedLogout = location.includes("forcedLogout=true");

  // Clear any remaining auth data when the component mounts
  useEffect(() => {
    if (isForcedLogout) {
      // Clear any localStorage items that might be related to authentication
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.includes("supabase") ||
            key.includes("auth") ||
            key.includes("token") ||
            key.includes("session"))
        ) {
          keysToRemove.push(key);
        }
      }

      // Remove the keys
      keysToRemove.forEach((key) => {
        console.log(`Removing localStorage item: ${key}`);
        localStorage.removeItem(key);
      });
    }
  }, [isForcedLogout]);

  const handleLogin = async () => {
    if (isLoading) return; // Prevent multiple clicks

    try {
      setIsLoading(true);
      console.log("Starting Google sign-in process");
      const { error } = await signInWithGoogle();

      if (error) {
        console.error("Google sign-in error:", error);
        toast({
          title: "Authentication error",
          description: error.message,
          variant: "destructive",
        });
        setIsLoading(false);
      }
      // Don't set isLoading to false on success as we'll be redirected
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Authentication error",
        description: "Failed to sign in with Google",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleLogin}
      disabled={isLoading}
      className={`w-full flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-md hover:scale-[1.02] ${
        variant === "primary"
          ? "bg-blue-600 hover:bg-blue-700 text-white border-0"
          : ""
      } ${className}`}
      variant={variant === "primary" ? "default" : variant}
    >
      {isLoading ? (
        <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full"></div>
      ) : (
        <div
          className={`flex items-center justify-center ${
            variant === "primary" ? "bg-white rounded-full h-6 w-6" : ""
          }`}
        >
          <FcGoogle className="h-5 w-5" />
        </div>
      )}
      <span className="font-medium">
        {isLoading
          ? "Signing in..."
          : `Sign in with ${
              provider.charAt(0).toUpperCase() + provider.slice(1)
            }`}
      </span>
    </Button>
  );
}
