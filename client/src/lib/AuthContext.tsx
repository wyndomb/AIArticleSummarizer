import * as React from "react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { apiRequestLock } from "./queryClient";
import { logWithTimestamp } from "./utils";

// Extend the Window interface to declare our custom properties
declare global {
  interface Window {
    _authInitStartTime?: number;
    _authInitEndTime?: number;
    _authInitDuration?: number;
    _authRefreshInterval?: number;
  }
}

// Create a global promise that resolves when auth is ready
let authReadyPromise: Promise<void> | null = null;
let authReadyResolver: (() => void) | null = null;

// Initialize the auth ready promise
if (!authReadyPromise) {
  authReadyPromise = new Promise<void>((resolve) => {
    authReadyResolver = resolve;
  });
}

// Function to get the auth ready promise
export const getAuthReadyPromise = () => {
  return authReadyPromise;
};

// Token refresh state tracking
const tokenRefreshState = {
  lastRefreshTime: 0,
  isRefreshing: false,
  refreshPromise: null as Promise<void> | null,
  refreshResolver: null as (() => void) | null,
};

// Initialize token refresh promise
tokenRefreshState.refreshPromise = new Promise<void>((resolve) => {
  tokenRefreshState.refreshResolver = resolve;
});

// Function to wait for token refresh to complete
export const waitForTokenRefresh = async () => {
  if (!tokenRefreshState.isRefreshing) return;

  // Add timeout to prevent indefinite waiting
  const timeoutPromise = new Promise<void>((_, reject) => {
    setTimeout(() => {
      logWithTimestamp("Token refresh wait timed out");
      if (tokenRefreshState.refreshResolver) {
        tokenRefreshState.refreshResolver();
      }
      reject(new Error("Token refresh wait timeout"));
    }, 3000); // 3 seconds max wait
  });

  try {
    await Promise.race([tokenRefreshState.refreshPromise!, timeoutPromise]);
  } catch (error) {
    logWithTimestamp(`Token refresh wait error: ${error}, proceeding anyway`);
  }
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  refreshAuthState: () => Promise<void>;
  waitForAuthReady: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  isAuthReady: false,
  refreshAuthState: async () => {},
  waitForAuthReady: async () => {},
  refreshToken: async () => false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Core state
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isAuthReady, setIsAuthReady] = useState(false);
  // Add flag to track first login
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  // Track session expiry
  const sessionExpiryTimeRef = useRef<number | null>(null);
  // Track background refresh timeout
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize auth state
  const initializeAuth = async () => {
    try {
      logWithTimestamp("Getting Supabase session...");

      // Add a safety timeout to ensure auth doesn't hang indefinitely
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Auth initialization timeout"));
        }, 8000); // 8 second maximum wait for session (increased from 5s)
      });

      // Get the current session with timeout
      const sessionPromise = supabase.auth.getSession();
      const result = await Promise.race([
        sessionPromise,
        timeoutPromise.then(() => ({ data: { session: null } })),
      ]);
      const { data } = result;

      // Update state based on session
      if (data.session) {
        logWithTimestamp("Session found, user is logged in");
        setSession(data.session);
        setUser(data.session.user);

        // Set session expiry time for background refresh
        if (data.session.expires_at) {
          sessionExpiryTimeRef.current = data.session.expires_at;
          scheduleTokenRefresh(data.session.expires_at);
        }
      } else {
        logWithTimestamp("No session found, user is not logged in");
        setSession(null);
        setUser(null);
      }
    } catch (error) {
      console.error("Error initializing auth:", error);
      logWithTimestamp(`Auth initialization error: ${error}`);
      setSession(null);
      setUser(null);
    } finally {
      // Mark auth as ready after session is retrieved and state is set, regardless of outcome
      logWithTimestamp("Auth initialization completed, marking as ready");
      markAuthReady();
    }
  };

  // Schedule background token refresh before expiry
  const scheduleTokenRefresh = (expiresAt: number) => {
    // Clear any existing refresh timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    const now = Math.floor(Date.now() / 1000);
    const expiryTime = expiresAt;
    const timeUntilExpiry = expiryTime - now;

    // Refresh token when 75% of the way to expiry
    const refreshThreshold = Math.floor(timeUntilExpiry * 0.25);
    const refreshTime = Math.max(refreshThreshold, 5 * 60); // At least 5 minutes before expiry

    logWithTimestamp(
      `Scheduling token refresh in ${refreshTime} seconds (${Math.floor(
        refreshTime / 60
      )} minutes)`
    );

    refreshTimeoutRef.current = setTimeout(() => {
      logWithTimestamp("🔄 Executing scheduled token refresh");
      refreshToken();
    }, refreshTime * 1000);
  };

  // Refresh token function
  const refreshToken = async (): Promise<boolean> => {
    if (tokenRefreshState.isRefreshing) {
      logWithTimestamp("Token refresh already in progress, waiting...");
      await waitForTokenRefresh();
      return true;
    }

    // Start the refresh process
    tokenRefreshState.isRefreshing = true;
    tokenRefreshState.refreshPromise = new Promise<void>((resolve) => {
      tokenRefreshState.refreshResolver = resolve;
    });

    try {
      logWithTimestamp("🔄 Refreshing auth token...");
      const { data, error } = await supabase.auth.refreshSession();

      tokenRefreshState.lastRefreshTime = Date.now();

      if (error) {
        logWithTimestamp(`❌ Token refresh failed: ${error.message}`);
        return false;
      }

      if (data.session) {
        logWithTimestamp("✅ Token refreshed successfully");
        setSession(data.session);
        setUser(data.session.user);

        // Update session expiry and schedule next refresh
        if (data.session.expires_at) {
          sessionExpiryTimeRef.current = data.session.expires_at;
          scheduleTokenRefresh(data.session.expires_at);
        }

        return true;
      } else {
        logWithTimestamp("❌ Token refresh returned no session");
        return false;
      }
    } catch (error) {
      logWithTimestamp(`❌ Error during token refresh: ${error}`);
      return false;
    } finally {
      // Resolve the refresh promise regardless of outcome
      if (tokenRefreshState.refreshResolver) {
        tokenRefreshState.refreshResolver();
      }
      tokenRefreshState.isRefreshing = false;
    }
  };

  // Helper function to mark auth as ready
  const markAuthReady = () => {
    if (!isAuthReady) {
      logWithTimestamp("🟢 AUTH FULLY INITIALIZED");
      setIsLoading(false);
      setIsAuthReady(true);

      // Store completion time for diagnostics
      window._authInitEndTime = Date.now();
      window._authInitDuration =
        (window._authInitEndTime || 0) - (window._authInitStartTime || 0);
      logWithTimestamp(
        `Auth initialization took ${window._authInitDuration}ms`
      );

      // Release the API request lock
      apiRequestLock.markReady();
      logWithTimestamp(
        "🔓 API request lock released, requests can now proceed"
      );

      // Remove the auth-initializing class
      document.body.classList.remove("auth-initializing");

      // Resolve the auth ready promise
      if (authReadyResolver) {
        authReadyResolver();
      }

      // Record in session storage
      window.sessionStorage.setItem(
        "auth_init_complete",
        Date.now().toString()
      );
      window.sessionStorage.setItem(
        "auth_init_duration",
        String(window._authInitDuration)
      );
    }
  };

  // Function to wait for auth to be ready - can be called by components
  const waitForAuthReady = async () => {
    if (isAuthReady) return;

    // Add timeout to prevent indefinite waiting
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => {
        logWithTimestamp(
          "Auth ready wait timed out, considering auth ready anyway"
        );
        // Force mark as ready on timeout
        if (!isAuthReady && authReadyResolver) {
          authReadyResolver();
        }
        reject(new Error("Auth ready wait timeout"));
      }, 5000); // Increased from 3s to 5s max wait
    });

    try {
      await Promise.race([authReadyPromise!, timeoutPromise]);
    } catch (error) {
      logWithTimestamp(`Auth ready wait error: ${error}, proceeding anyway`);
    }
  };

  // IMPORTANT: This useEffect only runs ONCE on mount
  useEffect(() => {
    logWithTimestamp("🔄 AUTH INITIALIZATION STARTED");

    // Store auth initialization start timestamp for diagnostics
    window._authInitStartTime = Date.now();

    // Add auth-initializing class to body to signal API requests to wait
    document.body.classList.add("auth-initializing");

    // Track page load/refresh time to help debug timing issues
    window.sessionStorage.setItem("auth_init_start", Date.now().toString());

    // Check if this is a first login scenario
    const isFirstLoginCheck = !localStorage.getItem("app_has_logged_in_before");
    if (isFirstLoginCheck) {
      logWithTimestamp(
        "⚠️ First login detected, additional initialization may be needed"
      );
      setIsFirstLogin(true);

      // Add a flag in sessionStorage to track first login state
      sessionStorage.setItem("is_first_login", "true");
    }

    // Initialize auth
    initializeAuth();

    // Set up the auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      logWithTimestamp(`Auth state change event: ${event}`);

      // Update React state based on the session change
      if (newSession) {
        setSession(newSession);
        setUser(newSession.user);

        // Update session expiry and schedule refresh
        if (newSession.expires_at) {
          sessionExpiryTimeRef.current = newSession.expires_at;
          scheduleTokenRefresh(newSession.expires_at);
        }

        // If this is a SIGNED_IN event and we're in a first login state
        if (event === "SIGNED_IN" && isFirstLoginCheck) {
          logWithTimestamp("Auth state change: First login SIGNED_IN detected");
          localStorage.setItem("app_has_logged_in_before", "true");
        }

        // Always ensure auth is marked as ready after session changes
        markAuthReady();
      } else {
        setSession(null);
        setUser(null);

        // Clear any scheduled token refresh
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
          refreshTimeoutRef.current = null;
        }

        // Also mark auth as ready when signed out
        markAuthReady();
      }
    });

    // Cleanup function
    return () => {
      logWithTimestamp("Cleaning up auth subscription");
      subscription.unsubscribe();

      // Clean up the class if component unmounts during initialization
      document.body.classList.remove("auth-initializing");

      // Clear any scheduled token refresh
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, []);

  // Simple refresh function that doesn't cause refresh loops
  const refreshAuthState = async () => {
    // Prevent rapid refreshes
    setRefreshCounter((prev) => prev + 1);
    if (refreshCounter > 5) {
      console.warn("Too many refresh attempts, limiting");
      return;
    }

    try {
      logWithTimestamp("Manually refreshing auth state...");
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);

        // Update session expiry and schedule refresh
        if (data.session.expires_at) {
          sessionExpiryTimeRef.current = data.session.expires_at;
          scheduleTokenRefresh(data.session.expires_at);
        }

        logWithTimestamp("Auth refresh successful, user is logged in");
      } else {
        setSession(null);
        setUser(null);

        // Clear any scheduled token refresh
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
          refreshTimeoutRef.current = null;
        }

        logWithTimestamp("Auth refresh successful, no user is logged in");
      }
    } catch (error) {
      console.error("Error refreshing auth state:", error);
    }
  };

  // Compute authenticated state - only if we have both user and session
  const isAuthenticated = !isLoading && !!user && !!session;

  // Value to provide in the context
  const value = {
    user,
    session,
    isLoading,
    isAuthenticated,
    isAuthReady,
    refreshAuthState,
    waitForAuthReady,
    refreshToken,
  };

  // Using React explicitly for JSX
  return React.createElement(AuthContext.Provider, { value }, children);
};
