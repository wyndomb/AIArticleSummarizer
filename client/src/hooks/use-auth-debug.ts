import { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";

/**
 * Custom hook to debug authentication issues
 * @returns The authentication state for convenience
 */
export function useAuthDebug() {
  const auth = useAuth();

  useEffect(() => {
    // Log authentication state changes
    console.log("Auth state:", {
      isAuthenticated: auth.isAuthenticated,
      isLoading: auth.isLoading,
      user: auth.user
        ? {
            id: auth.user.id,
            email: auth.user.email,
            role: auth.user.role,
            // Don't log sensitive data
            metadata: auth.user.user_metadata ? "exists" : "none",
          }
        : null,
      session: auth.session
        ? {
            expires_at: auth.session.expires_at,
            // Don't log sensitive data
            access_token: auth.session.access_token ? "exists" : "none",
          }
        : null,
    });

    // Check for potential issues
    if (auth.session && !auth.user) {
      console.warn("Potential issue: Session exists but user is null");
      // This is expected briefly during initialization but shouldn't persist
      if (!auth.isLoading) {
        console.warn(
          "Session exists but user is null while not loading - could indicate a sync issue"
        );
      } else {
        console.log(
          "User is still loading - this is normal during initialization"
        );
      }
    }

    if (!auth.session && auth.user) {
      console.warn("Potential issue: User exists but session is null");
    }

    if (auth.session && auth.session.expires_at) {
      const expiresAt = new Date(auth.session.expires_at * 1000);
      const now = new Date();

      if (expiresAt < now) {
        console.warn("Potential issue: Session is expired", {
          expiresAt,
          now,
          difference: (expiresAt.getTime() - now.getTime()) / 1000 / 60, // in minutes
        });
      }
    }
  }, [auth.isAuthenticated, auth.isLoading, auth.user, auth.session]);

  return auth;
}
