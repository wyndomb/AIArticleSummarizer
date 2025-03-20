import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { apiRequestLock } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

export default function AuthTest() {
  const {
    user,
    session,
    isLoading,
    isAuthenticated,
    isAuthReady,
    waitForAuthReady,
  } = useAuth();
  const [apiTest, setApiTest] = useState<{
    status: "idle" | "loading" | "success" | "error";
    message: string;
  }>({
    status: "idle",
    message: "",
  });
  const [authState, setAuthState] = useState<string[]>([]);

  // Record auth events
  useEffect(() => {
    const recordState = () => {
      setAuthState((prev) => [
        ...prev,
        `[${new Date().toISOString().substr(11, 12)}] Auth state: ${
          isAuthenticated ? "Authenticated" : "Not authenticated"
        }, Loading: ${isLoading}, Ready: ${isAuthReady}`,
      ]);
    };

    recordState();

    // Set up an interval to record state changes
    const interval = setInterval(recordState, 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, isLoading, isAuthReady]);

  // Function to test API requests
  const testApiRequest = async () => {
    setApiTest({ status: "loading", message: "Testing API request..." });

    try {
      // First wait for auth to be ready if it's not
      if (!isAuthReady) {
        setApiTest({
          status: "loading",
          message: "Waiting for auth to be ready...",
        });
        await waitForAuthReady();
      }

      // Make a simple API call
      const response = await fetch("/api/user", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      setApiTest({
        status: "success",
        message: `API request successful! User ID: ${data.id}`,
      });
    } catch (error) {
      setApiTest({
        status: "error",
        message: `API request failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }
  };

  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        throw error;
      }
      setAuthState((prev) => [
        ...prev,
        `[${new Date().toISOString().substr(11, 12)}] Session refresh: ${
          data.session ? "Success" : "No session returned"
        }`,
      ]);
    } catch (error) {
      setAuthState((prev) => [
        ...prev,
        `[${new Date().toISOString().substr(11, 12)}] Session refresh error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ]);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Auth Test Page</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              Auth Status
              {isLoading ? (
                <Loader2 className="ml-2 h-4 w-4 animate-spin text-muted-foreground" />
              ) : isAuthenticated ? (
                <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="ml-2 h-4 w-4 text-red-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="font-semibold">Auth Ready:</span>{" "}
                {isAuthReady ? (
                  <span className="text-green-600">Yes</span>
                ) : (
                  <span className="text-amber-600">No</span>
                )}
              </div>
              <div>
                <span className="font-semibold">Loading:</span>{" "}
                {isLoading ? (
                  <span className="text-amber-600">Yes</span>
                ) : (
                  <span className="text-green-600">No</span>
                )}
              </div>
              <div>
                <span className="font-semibold">Authenticated:</span>{" "}
                {isAuthenticated ? (
                  <span className="text-green-600">Yes</span>
                ) : (
                  <span className="text-red-600">No</span>
                )}
              </div>
              <div>
                <span className="font-semibold">API Lock Ready:</span>{" "}
                {apiRequestLock.isReady ? (
                  <span className="text-green-600">Yes</span>
                ) : (
                  <span className="text-amber-600">No</span>
                )}
              </div>
              {user && (
                <div>
                  <span className="font-semibold">User:</span> {user.email}
                </div>
              )}
            </div>

            <div className="mt-4 space-x-2">
              <Button onClick={refreshSession} size="sm" variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Session
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Test</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={testApiRequest}
              disabled={apiTest.status === "loading"}
            >
              {apiTest.status === "loading" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Test API Request
            </Button>

            {apiTest.status !== "idle" && (
              <div
                className={`mt-4 p-3 rounded text-sm ${
                  apiTest.status === "loading"
                    ? "bg-amber-50 text-amber-800"
                    : apiTest.status === "success"
                    ? "bg-green-50 text-green-800"
                    : "bg-red-50 text-red-800"
                }`}
              >
                {apiTest.message}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Auth State Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-3 rounded font-mono text-xs h-60 overflow-y-auto">
            {authState.map((entry, i) => (
              <div key={i} className="pb-1">
                {entry}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
