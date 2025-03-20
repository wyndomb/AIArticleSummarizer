import React from "react";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { forceLogout, supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { useLocation } from "wouter";
import { User, Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

export default function DebugPage() {
  const { user, session, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [localStorageItems, setLocalStorageItems] = useState<
    Record<string, string>
  >({});
  const [sessionStorageItems, setSessionStorageItems] = useState<
    Record<string, string>
  >({});
  const [cookies, setCookies] = useState<string[]>([]);
  const [isClearing, setIsClearing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [authData, setAuthData] = useState<{
    user: User | null;
    session: Session | null;
  }>({ user: null, session: null });

  // Get the toast hook
  const { toast } = useToast();

  // Restrict access to only wyndo.mitra@gmail.com
  useEffect(() => {
    // If user is loaded and not authorized, redirect to home
    if (!isLoading && user) {
      if (user.email !== "wyndo.mitra@gmail.com") {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access the debug page.",
          variant: "destructive",
        });
        setLocation("/");
      }
    } else if (!isLoading && !user) {
      // If not logged in, redirect to home
      toast({
        title: "Login Required",
        description: "You need to be logged in to access this page.",
        variant: "destructive",
      });
      setLocation("/login");
    }
  }, [user, isLoading, setLocation, toast]);

  // Get all localStorage and sessionStorage items
  useEffect(() => {
    // Get localStorage items
    const lsItems: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        lsItems[key] = localStorage.getItem(key) || "";
      }
    }
    setLocalStorageItems(lsItems);

    // Get sessionStorage items
    const ssItems: Record<string, string> = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        ssItems[key] = sessionStorage.getItem(key) || "";
      }
    }
    setSessionStorageItems(ssItems);

    // Get cookies
    setCookies(document.cookie.split(";").map((cookie) => cookie.trim()));

    // Try to get Supabase auth data directly
    const getSupabaseAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setAuthData({ user, session });
      } catch (error) {
        console.error("Error fetching Supabase auth data:", error);
      }
    };

    getSupabaseAuth();
  }, []);

  const handleForceLogout = async () => {
    setIsClearing(true);
    try {
      await forceLogout();
    } catch (error) {
      console.error("Force logout failed:", error);

      // Manual cleanup
      localStorage.clear();
      sessionStorage.clear();

      // Redirect to login
      window.location.href = "/login?forcedLogout=true&t=" + Date.now();
    } finally {
      setIsClearing(false);
    }
  };

  const handleFixAuthentication = async () => {
    setIsFixing(true);
    try {
      // Check if we have a valid session directly
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        // We have a valid session but React state doesn't match
        console.log("Valid session found, fixing React auth state");

        // Clear any problematic flags
        localStorage.removeItem("disable_auth_listeners");
        localStorage.removeItem("auth_loop_reset");
        localStorage.removeItem("auth_loop_detected");

        // Add a flag to indicate we're trying to fix auth
        localStorage.setItem("fixing_auth", "true");

        // Force reload the page to re-initialize auth
        window.location.reload();
      } else {
        console.log("No valid session found, redirecting to login");
        // No session, redirect to login
        window.location.href = "/login?t=" + Date.now();
      }
    } catch (error) {
      console.error("Error fixing authentication:", error);
    } finally {
      setIsFixing(false);
    }
  };

  const handleClearStorage = () => {
    localStorage.clear();
    sessionStorage.clear();

    // Clear cookies
    document.cookie.split(";").forEach(function (c) {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    // Update the state
    setLocalStorageItems({});
    setSessionStorageItems({});
    setCookies([]);

    // Reload the page
    window.location.reload();
  };

  const handleGoToLogin = () => {
    setLocation("/login");
  };

  const handleEnableAuthListeners = () => {
    localStorage.removeItem("disable_auth_listeners");
    window.location.reload();
  };

  // Get auth state flags
  const authListenersDisabled =
    localStorage.getItem("disable_auth_listeners") === "true";
  const authLoopDetected =
    localStorage.getItem("auth_loop_detected") === "true";
  const recentAuthReset = localStorage.getItem("auth_loop_reset") !== null;

  // Check for auth mismatch (Supabase says logged in, React says not)
  const hasAuthMismatch = authData.session && !isAuthenticated;

  // Add a utility to clear session storage items
  const clearPageRefreshHistory = () => {
    try {
      sessionStorage.removeItem("page_refresh_history");
      sessionStorage.removeItem("auth_refresh_timestamps");
      return true;
    } catch (e) {
      console.error("Error clearing page refresh history:", e);
      return false;
    }
  };

  // Add this to the Debug component UI
  const renderSessionStorageInfo = () => {
    // Get items from session storage
    const sessionStorageItems = Object.keys(sessionStorage).reduce(
      (acc, key) => {
        acc[key] = sessionStorage.getItem(key);
        return acc;
      },
      {} as Record<string, string | null>
    );

    return (
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-bold mb-3">Session Storage Items</h3>
        {Object.keys(sessionStorageItems).length > 0 ? (
          <>
            <pre className="text-sm overflow-x-auto bg-white p-2 rounded border">
              {JSON.stringify(sessionStorageItems, null, 2)}
            </pre>
            <div className="mt-3 flex gap-2">
              <Button
                onClick={() => {
                  const cleared = clearPageRefreshHistory();
                  toast({
                    title: cleared ? "Success" : "Error",
                    description: cleared
                      ? "Page refresh history cleared"
                      : "Failed to clear page refresh history",
                    variant: cleared ? "default" : "destructive",
                  });
                  // Reload the data to show it's cleared
                  setSessionStorageItems(
                    Object.keys(sessionStorage).reduce((acc, key) => {
                      acc[key] = sessionStorage.getItem(key) || "";
                      return acc;
                    }, {} as Record<string, string>)
                  );
                }}
                variant="outline"
                size="sm"
              >
                Clear Refresh History
              </Button>
              <Button
                onClick={() => {
                  sessionStorage.clear();
                  toast({
                    title: "Success",
                    description: "All session storage items cleared",
                  });
                  // Immediately update the UI
                  setSessionStorageItems({});
                  setTimeout(() => window.location.reload(), 1000);
                }}
                variant="destructive"
                size="sm"
              >
                Clear All Session Storage
              </Button>
            </div>
          </>
        ) : (
          <p className="text-gray-500">No items in session storage</p>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Authentication Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">React Auth Context State:</h3>
              <ul className="list-disc pl-5 mt-2">
                <li>Is Authenticated: {isAuthenticated ? "Yes" : "No"}</li>
                <li>Is Loading: {isLoading ? "Yes" : "No"}</li>
                <li>Has User: {user ? "Yes" : "No"}</li>
                <li>Has Session: {session ? "Yes" : "No"}</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold">Direct Supabase Auth State:</h3>
              <ul className="list-disc pl-5 mt-2">
                <li>Has User: {authData.user ? "Yes" : "No"}</li>
                <li>Has Session: {authData.session ? "Yes" : "No"}</li>
              </ul>

              {hasAuthMismatch && (
                <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 rounded border border-yellow-200">
                  <p className="font-semibold">
                    ⚠️ Authentication State Mismatch Detected
                  </p>
                  <p>
                    Supabase shows you are logged in, but React state doesn't
                    reflect this.
                  </p>
                  <Button
                    onClick={handleFixAuthentication}
                    variant="outline"
                    size="sm"
                    disabled={isFixing}
                    className="mt-2 bg-yellow-100 hover:bg-yellow-200"
                  >
                    {isFixing ? "Fixing..." : "Fix Authentication State"}
                  </Button>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold">Authentication Flags:</h3>
              <ul className="list-disc pl-5 mt-2">
                <li>
                  Auth Listeners Disabled:{" "}
                  {authListenersDisabled ? "Yes" : "No"}
                </li>
                <li>Auth Loop Detected: {authLoopDetected ? "Yes" : "No"}</li>
                <li>Recent Auth Reset: {recentAuthReset ? "Yes" : "No"}</li>
              </ul>
              {authListenersDisabled && (
                <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 rounded border border-yellow-200">
                  <p>
                    Auth listeners are disabled. This could prevent your React
                    app from receiving auth updates.
                  </p>
                  <Button
                    onClick={handleEnableAuthListeners}
                    variant="outline"
                    size="sm"
                    className="mt-2 bg-yellow-100 hover:bg-yellow-200"
                  >
                    Enable Auth Listeners
                  </Button>
                </div>
              )}
            </div>

            {user && (
              <div>
                <h3 className="font-semibold">User Info:</h3>
                <pre className="bg-gray-100 p-2 rounded mt-2 overflow-auto max-h-40">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </div>
            )}

            {session && (
              <div>
                <h3 className="font-semibold">Session Info:</h3>
                <pre className="bg-gray-100 p-2 rounded mt-2 overflow-auto max-h-40">
                  {JSON.stringify(
                    {
                      ...session,
                      // Mask the tokens in display
                      access_token: session.access_token ? "[MASKED]" : null,
                      refresh_token: session.refresh_token ? "[MASKED]" : null,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            )}

            <div>
              <h3 className="font-semibold">LocalStorage Items:</h3>
              <pre className="bg-gray-100 p-2 rounded mt-2 overflow-auto max-h-40">
                {JSON.stringify(localStorageItems, null, 2)}
              </pre>
            </div>

            {renderSessionStorageInfo()}

            <div>
              <h3 className="font-semibold">Cookies:</h3>
              <pre className="bg-gray-100 p-2 rounded mt-2 overflow-auto max-h-40">
                {JSON.stringify(cookies, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2 flex-wrap">
          <Button
            onClick={handleForceLogout}
            disabled={isClearing}
            variant="destructive"
          >
            {isClearing ? "Logging Out..." : "Force Logout"}
          </Button>
          <Button onClick={handleClearStorage} variant="outline">
            Clear All Storage
          </Button>
          <Button onClick={handleGoToLogin}>Go to Login</Button>
          <Button onClick={() => window.location.reload()}>Refresh Page</Button>
          {hasAuthMismatch && (
            <Button
              onClick={handleFixAuthentication}
              disabled={isFixing}
              variant="default"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isFixing ? "Fixing..." : "Fix Authentication"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
