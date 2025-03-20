import React from "react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { forceLogout } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * This page is specifically designed to handle forced logouts.
 * It will clear all authentication state and redirect to the login page.
 */
export default function ForcedLogoutPage() {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const [status, setStatus] = useState<"pending" | "success" | "error">(
    "pending"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Parse URL parameters
  const params = new URLSearchParams(location.split("?")[1] || "");
  const reason = params.get("reason") || "security";
  const redirectCount = params.get("count") || "0";

  // Get a human-readable reason
  const getReadableReason = () => {
    switch (reason) {
      case "too_many_redirects":
        return `Too many redirect attempts detected (${redirectCount}). This usually indicates an authentication loop.`;
      case "auth_loop":
        return "An authentication loop was detected and stopped.";
      case "user_initiated":
        return "You requested to be logged out.";
      case "security":
      default:
        return "You were logged out for security reasons.";
    }
  };

  useEffect(() => {
    const performLogout = async () => {
      try {
        console.log("Performing forced logout...");
        await forceLogout();
        setStatus("success");

        // After a short delay, redirect to login
        setTimeout(() => {
          setLocation("/login?forcedLogout=true");
        }, 3000);
      } catch (error) {
        console.error("Forced logout failed:", error);
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Unknown error"
        );
      }
    };

    performLogout();
  }, [setLocation]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl text-center">
            {status === "success"
              ? "Logged Out Successfully"
              : "Logging You Out"}
          </CardTitle>
          <CardDescription className="text-center">
            {getReadableReason()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "pending" && (
            <div className="flex flex-col items-center justify-center py-4">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
              <p>Clearing authentication data...</p>
            </div>
          )}

          {status === "success" && (
            <Alert className="bg-green-50 border-green-200 text-green-800">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>
                You've been successfully logged out. Redirecting to login
                page...
              </AlertDescription>
            </Alert>
          )}

          {status === "error" && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Logout Failed</AlertTitle>
              <AlertDescription>
                {errorMessage ||
                  "Failed to log you out. Please try manually clearing your browser data."}
              </AlertDescription>
            </Alert>
          )}

          <div className="text-sm text-center text-muted-foreground">
            If you're not redirected automatically, you can manually go to the{" "}
            <a
              href="/login"
              className="text-blue-500 hover:underline font-medium"
            >
              login page
            </a>{" "}
            or{" "}
            <a
              href="/debug"
              className="text-blue-500 hover:underline font-medium"
            >
              debug page
            </a>
            .
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button
            onClick={() => setLocation("/login")}
            variant="outline"
            className="w-full"
          >
            Go to Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
