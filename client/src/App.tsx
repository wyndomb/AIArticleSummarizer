import React, { Component, ErrorInfo, ReactNode, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { Header } from "./components/Header";
import { Toaster } from "./components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { handleAuthError } from "./lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Import pages
import Home from "@/pages/home";
import LoginPage from "@/pages/login";
import AuthCallback from "@/pages/auth/callback";
import ForcedLogoutPage from "@/pages/forced-logout";
import EmergencyLogoutPage from "@/pages/emergency-logout";
import DebugPage from "@/pages/debug";
import NotFound from "@/pages/not-found";

// Error boundary component to catch authentication errors
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);

    // Check if error is related to authentication
    if (
      error.message.includes("auth") ||
      error.message.includes("session") ||
      error.message.includes("token") ||
      error.message.includes("unauthorized") ||
      error.message.includes("a inside a") || // Catch nested anchor errors
      error.message.includes("nested") // Catch other nesting errors
    ) {
      // Don't immediately handle auth error - attempt recovery first
      console.log("Auth-related error detected, attempting recovery...");

      // Wait a moment before proceeding with error handling
      // This allows the app to potentially recover on its own
      setTimeout(() => {
        // Check if we still need to handle the error
        // If the app has been able to recover, don't force logout
        const recentRecoveryFlag = sessionStorage.getItem(
          "recent_auth_recovery"
        );
        if (!recentRecoveryFlag) {
          console.log("Recovery time elapsed, handling auth error");
          handleAuthError(error);
        } else {
          console.log("App has recovered from auth error, not forcing logout");
        }
      }, 3000);
    }
  }

  render() {
    if (this.state.hasError) {
      // We can render a fallback UI here
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Something went wrong
            </h2>
            <p className="text-gray-700 mb-4">
              An error occurred while rendering the application. Our team has
              been notified and is working to fix the issue.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Error details: {this.state.error?.message}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.href = "/login";
                }}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Return to Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Global error handler for uncaught errors
const GlobalErrorHandler: React.FC = () => {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Global error:", event.error);

      // Check if error is related to authentication or DOM nesting
      if (
        event.error?.message?.includes("auth") ||
        event.error?.message?.includes("session") ||
        event.error?.message?.includes("token") ||
        event.error?.message?.includes("unauthorized") ||
        event.error?.message?.includes("a inside a") || // Catch nested anchor errors
        event.error?.message?.includes("nested") // Catch other nesting errors
      ) {
        event.preventDefault(); // Prevent default error handling

        // Only redirect if we haven't recently redirected to prevent redirect loops
        const recentRedirect = sessionStorage.getItem("recent_error_redirect");
        if (!recentRedirect) {
          // Set a flag to indicate we're handling an auth error
          sessionStorage.setItem(
            "recent_error_redirect",
            Date.now().toString()
          );

          // First attempt to refresh the token to see if that resolves the issue
          import("./lib/supabase")
            .then(async ({ supabase }) => {
              console.log(
                "Attempting to refresh token to recover from auth error"
              );
              try {
                const { data, error } = await supabase.auth.refreshSession();
                if (!error && data.session) {
                  console.log("Token refresh succeeded, setting recovery flag");
                  sessionStorage.setItem(
                    "recent_auth_recovery",
                    Date.now().toString()
                  );

                  // Clean up recovery flag after a period
                  setTimeout(() => {
                    sessionStorage.removeItem("recent_auth_recovery");
                  }, 60000); // 1 minute
                } else {
                  console.log(
                    "Token refresh failed, proceeding to emergency logout"
                  );
                  // Only redirect if token refresh failed
                  window.location.href = "/emergency-logout";
                }
              } catch (refreshError) {
                console.log(
                  "Token refresh threw an error, proceeding to emergency logout"
                );
                window.location.href = "/emergency-logout";
              }
            })
            .catch(() => {
              console.log(
                "Failed to import supabase, proceeding to emergency logout"
              );
              window.location.href = "/emergency-logout";
            });
        } else {
          console.warn(
            "Multiple errors detected, not redirecting to prevent loop"
          );
        }
      }
    };

    window.addEventListener("error", handleError);

    // Set a loading timeout to detect stalled loading
    const loadingTimeoutId = setTimeout(() => {
      const loadingDuration =
        Date.now() - window.performance.timing.navigationStart;
      if (loadingDuration > 8000) {
        console.warn(`Page load taking unusually long: ${loadingDuration}ms`);

        // Check if auth is stalled
        if (document.body.classList.contains("auth-initializing")) {
          console.warn(
            "Auth still initializing after 8 seconds, might be stalled"
          );

          // Try to manually release the auth lock if it's stalled
          if (!window.sessionStorage.getItem("auth_init_complete")) {
            console.log("Attempting to force complete auth initialization");

            // Remove the auth-initializing class
            document.body.classList.remove("auth-initializing");

            // Force mark API lock as ready
            import("./lib/queryClient")
              .then(({ apiRequestLock }) => {
                if (apiRequestLock && !apiRequestLock.isReady) {
                  console.log("Force-releasing API request lock");
                  apiRequestLock.markReady();
                }
              })
              .catch((err) => {
                console.error("Error importing queryClient:", err);
              });

            // Set the completion flag
            window.sessionStorage.setItem(
              "auth_init_complete",
              Date.now().toString()
            );
            window.sessionStorage.setItem("auth_init_forced", "true");
          }
        }
      }
    }, 8000);

    // Clean up any stale auth recovery flags
    const cleanupTimeoutId = setTimeout(() => {
      const recentRecovery = sessionStorage.getItem("recent_auth_recovery");
      if (recentRecovery) {
        const recoveryTime = parseInt(recentRecovery, 10);
        const now = Date.now();
        if (now - recoveryTime > 60000) {
          // 1 minute
          sessionStorage.removeItem("recent_auth_recovery");
        }
      }

      const recentRedirect = sessionStorage.getItem("recent_error_redirect");
      if (recentRedirect) {
        const redirectTime = parseInt(recentRedirect, 10);
        const now = Date.now();
        if (now - redirectTime > 300000) {
          // 5 minutes
          sessionStorage.removeItem("recent_error_redirect");
        }
      }
    }, 60000);

    return () => {
      window.removeEventListener("error", handleError);
      clearTimeout(loadingTimeoutId);
      clearTimeout(cleanupTimeoutId);
    };
  }, []);

  return null;
};

// Create a special protected route component for admin-only access
function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // If user is loaded and isn't the admin, redirect to home
    if (!isLoading) {
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "You need to be logged in to access this page.",
          variant: "destructive",
        });
        setLocation("/login");
      } else if (user.email !== "wyndo.mitra@gmail.com") {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page.",
          variant: "destructive",
        });
        setLocation("/");
      }
    }
  }, [user, isLoading, setLocation, toast]);

  // Show loading state while checking permissions
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // If the user is the admin, render the children
  if (user && user.email === "wyndo.mitra@gmail.com") {
    return <>{children}</>;
  }

  // This will typically not be rendered, as the useEffect will redirect
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/forced-logout" component={ForcedLogoutPage} />
      <Route path="/emergency-logout" component={EmergencyLogoutPage} />
      <Route path="/debug">
        <AdminRoute>
          <DebugPage />
        </AdminRoute>
      </Route>
      <Route path="/">
        <ProtectedRoute>
          <Home />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AuthProvider>
          <GlobalErrorHandler />
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              <Router />
            </main>
          </div>
          <Toaster />
        </AuthProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
