import { supabase } from "./supabase";
import { logWithTimestamp } from "./utils";

/**
 * Checks if the current authentication state is valid
 * @returns Promise<boolean> - True if authentication is valid, false otherwise
 */
export const checkAuthValidity = async (): Promise<boolean> => {
  try {
    // Get the current session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return false;
    }

    // Try to get the user to verify the session is valid
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return !!user;
  } catch (error) {
    console.error("Error checking auth validity:", error);
    return false;
  }
};

/**
 * Forces user logout
 * @returns Promise<void>
 */
export const forceLogout = async (): Promise<void> => {
  try {
    console.log("Forcing logout");
    await supabase.auth.signOut();
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/login";
  } catch (error) {
    console.error("Force logout error:", error);
    // Manual cleanup if Supabase fails
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/login";
  }
};

/**
 * Handles authentication errors by attempting to force logout
 * @param error - The error that occurred
 * @returns Promise<void>
 */
export const handleAuthError = async (error: any): Promise<void> => {
  console.error("Authentication error:", error);

  try {
    // Attempt to force logout
    await forceLogout();
  } catch (logoutError) {
    console.error("Force logout failed:", logoutError);
    // If force logout fails, try to clear local storage manually
    localStorage.removeItem("supabase.auth.token");
    localStorage.removeItem("supabase.auth.expires_at");
    localStorage.removeItem("supabase.auth.refresh_token");

    // Redirect to login page
    window.location.href = "/login";
  }
};

/**
 * Enhanced utility to safely perform an operation with token refresh and retry
 * @param operation - Function with the operation to perform
 * @param refreshToken - Function to refresh the token
 * @param maxRetries - Maximum number of retries (default: 2)
 * @returns Promise with the operation result
 */
export const enhancedTokenRetry = async <T>(
  operation: () => Promise<T>,
  refreshToken: () => Promise<boolean>,
  maxRetries: number = 2
): Promise<T> => {
  let retries = 0;

  const executeWithRetry = async (): Promise<T> => {
    try {
      return await operation();
    } catch (error: any) {
      // Check if it's an auth error (401/403)
      if (
        error?.message?.includes("401") ||
        error?.message?.includes("403") ||
        error?.message?.includes("auth") ||
        error?.message?.includes("unauthorized")
      ) {
        if (retries < maxRetries) {
          retries++;
          logWithTimestamp(
            "AUTH",
            `🔄 Auth error detected, refreshing token and retrying (${retries}/${maxRetries})`
          );

          // Try to refresh the auth token
          try {
            const refreshSuccess = await refreshToken();
            if (refreshSuccess) {
              logWithTimestamp("AUTH", "✅ Token refreshed successfully");
              // Add a small delay to ensure token propagation
              await new Promise((resolve) => setTimeout(resolve, 500));
              return executeWithRetry();
            } else {
              logWithTimestamp(
                "AUTH",
                "❌ Token refresh failed, retrying anyway"
              );
              await new Promise((resolve) => setTimeout(resolve, 800));
              return executeWithRetry();
            }
          } catch (refreshError) {
            logWithTimestamp(
              "AUTH",
              `❌ Error refreshing token: ${refreshError}`
            );
            if (retries < maxRetries) {
              // Add an incremental backoff delay
              const backoffDelay = 1000 * retries;
              logWithTimestamp(
                "AUTH",
                `Waiting ${backoffDelay}ms before retry ${retries}/${maxRetries}`
              );
              await new Promise((resolve) => setTimeout(resolve, backoffDelay));
              return executeWithRetry();
            }
          }
        }
      }

      // Re-throw the original error if we've exhausted retries or it's not an auth error
      throw error;
    }
  };

  return executeWithRetry();
};
