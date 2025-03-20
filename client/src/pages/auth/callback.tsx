import * as React from "react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader } from "lucide-react";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);
  const [redirectCountdown, setRedirectCountdown] = useState(3); // Reduced countdown time

  useEffect(() => {
    // Handle the OAuth callback
    const handleAuthCallback = async () => {
      try {
        console.log("Auth callback: Processing OAuth callback");

        const isFirstLogin = !localStorage.getItem("app_has_logged_in_before");
        if (isFirstLogin) {
          console.log("Auth callback: First login scenario detected");
          // Set a session flag to indicate first login status
          sessionStorage.setItem("is_first_login", "true");
        }

        setProcessing(true);

        // Process the OAuth callback by getting the session
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Error during auth callback:", error);
          setError(error.message);
          setProcessing(false);

          setTimeout(() => {
            setLocation("/login?error=auth-error");
          }, redirectCountdown * 1000);

          return;
        }

        // Check if we have a session
        if (!data.session) {
          console.error("No session after auth callback");
          setError("No session was created. Please try signing in again.");
          setProcessing(false);

          setTimeout(() => {
            setLocation("/login?error=no-session");
          }, redirectCountdown * 1000);

          return;
        }

        console.log("Auth callback successful");

        // If this is the first login, handle it specially
        if (isFirstLogin) {
          console.log("Auth callback: First login processing");

          // Store login info in session storage for persistence
          try {
            sessionStorage.setItem(
              "auth_user_email",
              data.session.user.email || ""
            );
            sessionStorage.setItem("auth_user_id", data.session.user.id);
            sessionStorage.setItem("auth_first_login", "true");
          } catch (e) {
            console.error("Error saving auth data to session storage:", e);
          }
        }

        // Short delay to ensure auth state can propagate
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Redirect to home
        setLocation("/");
      } catch (error) {
        console.error("Error processing auth callback:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
        setProcessing(false);

        setTimeout(() => {
          setLocation("/login?error=auth-error");
        }, redirectCountdown * 1000);
      }
    };

    handleAuthCallback();

    // Countdown timer for redirect on error
    let timer: NodeJS.Timeout | null = null;
    if (error) {
      timer = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev <= 1) {
            if (timer) clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [setLocation, error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md text-center">
        {processing ? (
          <>
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-xl font-semibold">
              Completing authentication...
            </p>
            <p className="text-sm text-gray-500">
              You will be redirected momentarily
            </p>
          </>
        ) : error ? (
          <>
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Authentication Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <p className="text-sm text-gray-500">
              Redirecting in {redirectCountdown} seconds...
            </p>
          </>
        ) : (
          <>
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-xl font-semibold">Authentication successful!</p>
            <p className="text-sm text-gray-500">
              Redirecting you to home page...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
