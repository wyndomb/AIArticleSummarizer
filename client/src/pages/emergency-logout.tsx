import React from "react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";

/**
 * This page is specifically designed for emergency logouts when other methods fail.
 * It uses the most aggressive approach to clear all authentication data.
 */
export default function EmergencyLogoutPage() {
  const [isClearing, setIsClearing] = useState(true);
  const [isCleared, setIsCleared] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoutSteps, setLogoutSteps] = useState<
    { step: string; status: "pending" | "success" | "error" }[]
  >([
    { step: "Disable auth listeners", status: "pending" },
    { step: "Sign out from Supabase", status: "pending" },
    { step: "Clear localStorage", status: "pending" },
    { step: "Clear sessionStorage", status: "pending" },
    { step: "Clear cookies", status: "pending" },
  ]);

  // Perform emergency logout immediately on page load
  useEffect(() => {
    const performEmergencyLogout = async () => {
      try {
        console.log("Performing emergency logout");

        // Update first step status
        updateStepStatus(0, "success");

        // Immediately disable authentication listeners
        localStorage.setItem("disable_auth_listeners", "true");

        // Mark that we're in a loop
        localStorage.setItem("auth_loop_detected", "true");

        // Try to sign out from Supabase
        try {
          await supabase.auth.signOut({ scope: "global" });
          updateStepStatus(1, "success");
        } catch (e) {
          console.error("Failed to sign out from Supabase:", e);
          updateStepStatus(1, "error");
        }

        // Clear all localStorage
        try {
          localStorage.clear();
          // Make sure we keep these flags
          localStorage.setItem("disable_auth_listeners", "true");
          localStorage.setItem("auth_loop_detected", "true");
          updateStepStatus(2, "success");
        } catch (e) {
          console.error("Failed to clear localStorage:", e);
          updateStepStatus(2, "error");
        }

        // Clear all sessionStorage
        try {
          sessionStorage.clear();
          updateStepStatus(3, "success");
        } catch (e) {
          console.error("Failed to clear sessionStorage:", e);
          updateStepStatus(3, "error");
        }

        // Clear all cookies
        try {
          document.cookie.split(";").forEach(function (c) {
            document.cookie = c
              .replace(/^ +/, "")
              .replace(
                /=.*/,
                "=;expires=" + new Date().toUTCString() + ";path=/"
              );
          });
          updateStepStatus(4, "success");
        } catch (e) {
          console.error("Failed to clear cookies:", e);
          updateStepStatus(4, "error");
        }

        // Set flags to indicate success
        setIsClearing(false);
        setIsCleared(true);

        // Redirect to login after a delay
        setTimeout(() => {
          // Set a temporary flag to indicate we performed a reset
          localStorage.setItem("auth_loop_reset", Date.now().toString());

          // Remove auth flags that could prevent re-authentication
          localStorage.removeItem("disable_auth_listeners");
          localStorage.removeItem("auth_loop_detected");

          // Redirect to login page
          window.location.href =
            "/login?forcedLogout=true&source=emergency&t=" + Date.now();
        }, 3000);
      } catch (error) {
        console.error("Error during emergency logout:", error);
        setError(
          "Failed to complete logout. Please close your browser completely and reopen."
        );
        setIsClearing(false);
      }
    };

    performEmergencyLogout();
  }, []);

  // Update the status of a logout step
  const updateStepStatus = (
    index: number,
    status: "pending" | "success" | "error"
  ) => {
    setLogoutSteps((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status };
      return updated;
    });
  };

  const handleManualRedirect = () => {
    // Set a temporary flag to indicate we performed a reset
    localStorage.setItem("auth_loop_reset", Date.now().toString());

    // Remove auth flags that could prevent re-authentication
    localStorage.removeItem("disable_auth_listeners");
    localStorage.removeItem("auth_loop_detected");

    window.location.href =
      "/login?forcedLogout=true&source=emergency&t=" + Date.now();
  };

  const handleClearAgain = () => {
    setIsClearing(true);
    setError(null);
    window.location.reload();
  };

  // Get status icon for each step
  const getStatusIcon = (status: "pending" | "success" | "error") => {
    switch (status) {
      case "success":
        return <span className="text-green-500">✓</span>;
      case "error":
        return <span className="text-red-500">✗</span>;
      default:
        return <span className="text-gray-400">⋯</span>;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-red-600">
            Emergency Authentication Reset
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isClearing && (
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin h-12 w-12 border-4 border-red-600 border-t-transparent rounded-full mb-4"></div>
              <p className="text-lg font-semibold">
                Performing emergency logout...
              </p>

              <div className="w-full max-w-sm border rounded-md p-3 bg-gray-50">
                <p className="text-sm font-medium mb-2">Progress:</p>
                <ul className="space-y-2">
                  {logoutSteps.map((step, index) => (
                    <li key={index} className="flex justify-between text-sm">
                      <span>{step.step}</span>
                      {getStatusIcon(step.status)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {isCleared && !error && (
            <div className="text-center">
              <div className="text-green-500 text-5xl mb-4">✓</div>
              <p className="text-green-600 font-semibold text-lg mb-2">
                Authentication Reset Complete
              </p>
              <p className="text-gray-600 mb-4">
                All authentication data has been cleared. You will be redirected
                to the login page shortly.
              </p>
              <Button onClick={handleManualRedirect} className="w-full">
                Go to Login Now
              </Button>
            </div>
          )}

          {error && (
            <div className="text-center">
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="flex flex-col gap-2 mt-4">
                <Button onClick={handleClearAgain} variant="destructive">
                  Try Again
                </Button>
                <Button onClick={handleManualRedirect} variant="outline">
                  Go to Login Anyway
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
