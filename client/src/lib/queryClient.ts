import { QueryClient } from "@tanstack/react-query";
import { getAuthReadyPromise, waitForTokenRefresh } from "./AuthContext";
import { logWithTimestamp, generateUUID } from "./utils";

// ====================================================================
// GLOBAL API REQUEST LOCK - Prevents premature API requests
// ====================================================================

export const apiRequestLock = {
  isReady: false,
  readyPromise: null as Promise<void> | null,
  readyResolver: null as ((value: void) => void) | null,
  forceReadyTimeout: null as NodeJS.Timeout | null,

  // Initialize the lock (called automatically)
  initialize: function () {
    if (this.readyPromise) return this.readyPromise; // Already initialized

    this.isReady = false;
    logWithTimestamp("API", "🔒 API request lock initialized");

    this.readyPromise = new Promise<void>((resolve) => {
      this.readyResolver = resolve;
    });

    // Clear any existing timeout
    if (this.forceReadyTimeout) {
      clearTimeout(this.forceReadyTimeout);
    }

    // Set a reasonable timeout as fallback
    const timeoutDuration = 10000; // 10 seconds max wait

    // Set a timeout in case something goes wrong and we never get markReady
    this.forceReadyTimeout = setTimeout(() => {
      if (!this.isReady) {
        logWithTimestamp(
          "API",
          `⚠️ API request lock force-released after timeout`
        );
        this.markReady();
      }
    }, timeoutDuration);

    return this.readyPromise;
  },

  // Mark the lock as ready (called by auth system when fully initialized)
  markReady: function () {
    if (this.isReady) return; // Already ready

    this.isReady = true;
    logWithTimestamp("API", "🔓 API request lock marked as ready");

    if (this.readyResolver) {
      this.readyResolver();
      this.readyResolver = null;
    }

    // Store the timestamp when API became ready
    window.sessionStorage.setItem("api_lock_ready_time", Date.now().toString());
  },

  // Reset the lock if needed (can be called if auth state becomes invalid)
  reset: function () {
    logWithTimestamp("API", "🔄 Resetting API request lock");

    // Only reset if it was previously ready
    if (this.isReady) {
      this.isReady = false;

      // Clear any existing timeout
      if (this.forceReadyTimeout) {
        clearTimeout(this.forceReadyTimeout);
      }

      // Initialize a new promise
      this.readyPromise = new Promise<void>((resolve) => {
        this.readyResolver = resolve;
      });

      // Set a new timeout
      this.forceReadyTimeout = setTimeout(() => {
        if (!this.isReady) {
          logWithTimestamp(
            "API",
            `⚠️ Reset API request lock force-released after timeout`
          );
          this.markReady();
        }
      }, 8000); // 8 seconds timeout

      return this.readyPromise;
    }

    return this.readyPromise;
  },

  // Wait until the lock is ready (used by API requests)
  waitUntilReady: async function () {
    // If already ready, return immediately
    if (this.isReady) return;

    // If no ready promise exists, initialize it
    if (!this.readyPromise) {
      this.initialize();
    }

    try {
      logWithTimestamp(
        "API",
        "⏳ Waiting for API request lock to be released..."
      );

      // Add a timeout to prevent hanging forever
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => {
          logWithTimestamp(
            "API",
            "⚠️ Timeout while waiting for API lock, force-releasing"
          );
          // Force set ready state on timeout
          this.markReady();
          reject(new Error("API lock wait timeout"));
        }, 5000); // 5 second maximum wait
      });

      // First, try to wait for auth to be ready using the auth promise
      const authPromise = getAuthReadyPromise();
      if (authPromise) {
        try {
          // Race the auth promise against a timeout
          await Promise.race([authPromise, timeoutPromise]);

          // If auth is ready but API lock isn't, mark it ready
          if (!this.isReady) {
            logWithTimestamp("API", "Auth is ready, marking API lock as ready");
            this.markReady();
            return;
          }
        } catch (error) {
          // If auth promise fails, log and continue with regular waiting
          logWithTimestamp(
            "API",
            `Auth promise rejected or timed out: ${error}, falling back to regular wait`
          );
        }
      }

      // Fall back to waiting for our own ready promise with timeout
      await Promise.race([this.readyPromise!, timeoutPromise]);

      logWithTimestamp(
        "API",
        "✅ API request lock released, proceeding with request"
      );
    } catch (error) {
      // If something goes wrong, force release the lock and continue
      logWithTimestamp(
        "API",
        `⚠️ API lock wait error, force-releasing: ${error}`
      );
      this.markReady();
    }
  },
};

// Initialize the lock immediately
apiRequestLock.initialize();

// ====================================================================
// API CLIENT CONFIGURATION
// ====================================================================

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// ====================================================================
// ENHANCED API REQUEST FUNCTION
// ====================================================================

/**
 * Enhanced API request function that handles waiting for auth initialization
 * @param method HTTP method
 * @param url API endpoint
 * @param body Request body (optional)
 * @param init Additional fetch options (optional)
 * @returns Fetch response
 */
export const apiRequest = async (
  method: string,
  url: string,
  body?: any,
  init?: RequestInit
): Promise<Response> => {
  const requestId = generateUUID().slice(0, 8); // Short ID for logging

  // Check if we should retry failed requests
  const maxRetries = 3; // Increased from 2 to 3 for better resilience
  let retryCount = 0;
  let tokenRefreshed = false;

  const makeRequest = async (): Promise<Response> => {
    try {
      logWithTimestamp(
        "API",
        `📤 [${requestId}] Starting ${method} request to ${url}${
          retryCount > 0 ? ` (retry #${retryCount})` : ""
        }`
      );
      const requestStartTime = Date.now();

      // First, wait for the API lock to be released and auth to be ready
      if (!apiRequestLock.isReady) {
        logWithTimestamp(
          "API",
          `🔒 [${requestId}] API request lock is active, waiting for auth to initialize...`
        );

        await apiRequestLock.waitUntilReady();
        logWithTimestamp(
          "API",
          `🔓 [${requestId}] API request lock released, continuing with request`
        );
      }

      // Wait if a token refresh is in progress
      try {
        await waitForTokenRefresh();
      } catch (error) {
        logWithTimestamp(
          "API",
          `⚠️ [${requestId}] Token refresh wait error, continuing anyway: ${error}`
        );
      }

      // Make fetch request
      const fetchStartTime = Date.now();
      logWithTimestamp(
        "API",
        `🌐 [${requestId}] Making fetch request to ${url}`
      );

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        ...init,
      });

      const fetchDuration = Date.now() - fetchStartTime;
      logWithTimestamp(
        "API",
        `✅ [${requestId}] Fetch completed with status ${res.status} in ${fetchDuration}ms`
      );

      // Handle 401/403 errors - retry after token refresh
      if (res.status === 401 || res.status === 403) {
        logWithTimestamp(
          "API",
          `🔒 [${requestId}] Auth error from API: ${res.status}`
        );

        if (retryCount < maxRetries) {
          retryCount++;

          // Only try to refresh the token once
          if (!tokenRefreshed) {
            logWithTimestamp(
              "API",
              `🔄 [${requestId}] Auth error, attempting token refresh`
            );

            // Import dynamically to avoid circular dependency
            const { useAuth } = await import("./AuthContext");
            const auth = useAuth();

            if (auth && auth.refreshToken) {
              const refreshResult = await auth.refreshToken();
              tokenRefreshed = true;

              if (refreshResult) {
                logWithTimestamp(
                  "API",
                  `✅ [${requestId}] Token refreshed successfully, retrying request`
                );
              } else {
                logWithTimestamp(
                  "API",
                  `❌ [${requestId}] Token refresh failed, retrying anyway`
                );
              }
            }
          }

          const retryDelay = 800 + retryCount * 300; // Progressive delay (800ms, 1100ms, 1400ms)

          logWithTimestamp(
            "API",
            `🔄 [${requestId}] Retrying after ${retryDelay}ms delay (${retryCount}/${maxRetries})`
          );

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          return makeRequest();
        } else {
          logWithTimestamp(
            "API",
            `⚠️ [${requestId}] Maximum retries reached for auth error, giving up`
          );
        }
      }

      // Total request time including any waiting for auth
      const totalDuration = Date.now() - requestStartTime;
      logWithTimestamp(
        "API",
        `⏱️ [${requestId}] Total request time: ${totalDuration}ms (includes any auth waiting)`
      );

      return res;
    } catch (error) {
      // For network errors, retry if we haven't exceeded the limit
      if (retryCount < maxRetries) {
        retryCount++;
        const retryDelay = 1000 * retryCount; // 1s, 2s, 3s

        logWithTimestamp(
          "API",
          `⚠️ [${requestId}] Request error: ${error}. Retrying (${retryCount}/${maxRetries}) after ${retryDelay}ms`
        );

        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        return makeRequest();
      }

      // If we've exhausted retries, throw the error
      logWithTimestamp("API", `❌ [${requestId}] Request failed: ${error}`);
      throw error;
    }
  };

  return makeRequest();
};
