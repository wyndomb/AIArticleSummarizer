import React from "react";
import { Link } from "wouter";
import { UserProfile } from "./auth/UserProfile";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Bug, AlertTriangle, RefreshCw, UserIcon } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { checkAuthValidity } from "@/lib/authUtils";
import { supabase } from "@/lib/supabase";

export function Header() {
  const { isAuthenticated, user, session, refreshAuthState } = useAuth();
  const [authMismatch, setAuthMismatch] = useState(false);
  const [isFixingAuth, setIsFixingAuth] = useState(false);
  const autoFixAttemptedRef = useRef(false);
  const reloadAttemptedRef = useRef(false);
  const [fixCounter, setFixCounter] = useState(0);

  // Check for authentication state mismatch and auto fix more intelligently
  useEffect(() => {
    const checkAndFixAuthMismatch = async () => {
      try {
        // Skip if we're currently fixing auth
        if (isFixingAuth) return;

        // Get session directly from Supabase
        const { data } = await supabase.auth.getSession();
        const hasSupabaseSession = !!data.session;

        // Check if localStorage token exists
        const supabaseUserKey =
          "sb-" +
          import.meta.env.VITE_SUPABASE_URL.split("//")[1].split(".")[0] +
          "-auth-token";
        const hasLocalToken = !!localStorage.getItem(supabaseUserKey);

        // CRITICAL CASE: React says we're authenticated but Supabase says we're not AND we have a token in localStorage
        // This is what's causing the infinite reload loop
        if (!hasSupabaseSession && isAuthenticated && hasLocalToken) {
          console.log(
            "Critical auth mismatch: React says auth but Supabase doesn't"
          );

          // Only update UI if we're not fixing and haven't tried too many times
          if (fixCounter < 2) {
            setAuthMismatch(true);
          }

          // Only try to fix if we haven't already tried
          if (!autoFixAttemptedRef.current && fixCounter < 2) {
            console.log("Attempting to fix critical auth mismatch in Header");
            autoFixAttemptedRef.current = true;
            setIsFixingAuth(true);
            setFixCounter((prev) => prev + 1);

            // Clear any flags that might be causing issues
            localStorage.removeItem("disable_auth_listeners");
            localStorage.removeItem("auth_loop_reset");
            localStorage.removeItem("auth_loop_detected");
            localStorage.removeItem("tried_localStorage_user");
            sessionStorage.removeItem("auth_page_reloaded");

            // Try refreshing auth state without reloading
            await refreshAuthState();

            // Check if the refresh helped
            const checkResult = await supabase.auth.getSession();

            // If we still have a mismatch
            if (!checkResult.data.session) {
              console.log(
                "Refresh didn't fix Supabase session, will keep UI warning"
              );

              // Only try a reload once to avoid loops
              if (!reloadAttemptedRef.current && fixCounter === 1) {
                console.log("Will try one reload to fix critical auth issue");
                reloadAttemptedRef.current = true;

                // Set a flag to indicate we're doing an intentional reload
                sessionStorage.setItem("intentional_auth_reload", "true");

                // Attempt one reload with a delay
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              } else {
                // We've already tried auto-fixing including a reload, just leave the warning
                setIsFixingAuth(false);
              }
            } else {
              console.log("Fixed critical auth mismatch!");
              setAuthMismatch(false);
              setIsFixingAuth(false);
            }
          }
        }
        // If Supabase says we're logged in but React state doesn't reflect this
        else if (hasSupabaseSession && !isAuthenticated && !user) {
          console.log(
            "Auth mismatch detected in Header: Supabase session exists but React state doesn't reflect it"
          );

          // Only update UI if not fixing and haven't tried too many times
          if (!isFixingAuth && fixCounter < 2) {
            setAuthMismatch(true);
          }

          // Only attempt to fix automatically once per page load
          if (!autoFixAttemptedRef.current && fixCounter < 2) {
            console.log("Automatically fixing auth state from Header");
            autoFixAttemptedRef.current = true;
            setIsFixingAuth(true);
            setFixCounter((prev) => prev + 1);

            // Remove flags that might be preventing proper auth initialization
            localStorage.removeItem("disable_auth_listeners");
            localStorage.removeItem("auth_loop_reset");
            localStorage.removeItem("auth_loop_detected");
            localStorage.removeItem("tried_localStorage_user");
            sessionStorage.removeItem("auth_page_reloaded");

            // Refresh auth state
            await refreshAuthState();

            // Check if it worked
            if (!isAuthenticated) {
              // If the refresh didn't fix it on first try, try once more
              if (fixCounter === 0) {
                await refreshAuthState();
              }

              // If still not fixed and we haven't tried a reload yet
              if (
                !isAuthenticated &&
                !reloadAttemptedRef.current &&
                fixCounter === 1
              ) {
                console.log("Multiple refreshes failed, will try one reload");
                reloadAttemptedRef.current = true;

                // Set a flag to indicate we're doing an intentional reload
                sessionStorage.setItem("intentional_auth_reload", "true");

                // Attempt one reload with a delay
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              } else {
                // We've tried everything, so just leave the warning visible
                console.log(
                  "Auto-fix in Header failed, keeping warning for manual intervention"
                );
                setIsFixingAuth(false);
              }
            } else {
              console.log("Auto-fix in Header was successful");
              setAuthMismatch(false);
              setIsFixingAuth(false);
            }
          } else if (!isFixingAuth) {
            // If we've already tried an auto-fix but still see a mismatch, show the message
            setAuthMismatch(true);
          }
        } else {
          // No mismatch, or user is authenticated now after fix
          setAuthMismatch(false);

          // Reset the auto-fix attempt flag if auth is good
          if (
            (isAuthenticated && hasSupabaseSession) ||
            (!isAuthenticated && !hasSupabaseSession)
          ) {
            if (autoFixAttemptedRef.current) {
              console.log("Auth state is consistent now, resetting fix flags");
              autoFixAttemptedRef.current = false;
              reloadAttemptedRef.current = false;
              setFixCounter(0);
            }
          }
        }
      } catch (error) {
        console.error("Error checking auth mismatch in Header:", error);
        setIsFixingAuth(false);
      }
    };

    // Run immediately
    checkAndFixAuthMismatch();

    // Check again in a second in case the first fix is still processing
    const timeout = setTimeout(checkAndFixAuthMismatch, 1000);

    return () => {
      clearTimeout(timeout);
    };
  }, [isAuthenticated, user, refreshAuthState, isFixingAuth, fixCounter]);

  // Handle manual fix (only shown if auto-fix failed)
  const handleFixAuth = async () => {
    console.log("Manually fixing authentication state...");
    setIsFixingAuth(true);

    // Remove flags that might be preventing proper auth initialization
    localStorage.removeItem("disable_auth_listeners");
    localStorage.removeItem("auth_loop_reset");
    localStorage.removeItem("auth_loop_detected");
    localStorage.removeItem("tried_localStorage_user");
    sessionStorage.removeItem("auth_page_reloaded");
    sessionStorage.removeItem("auth_page_intentional_reload");
    sessionStorage.removeItem("home_reload_count");
    sessionStorage.removeItem("last_home_reload");

    // Try refreshing auth state first
    await refreshAuthState();

    // Check if it worked
    const checkResult = await supabase.auth.getSession();
    const reactAuthStatus = isAuthenticated;
    const supabaseAuthStatus = !!checkResult.data.session;

    // If the states are still inconsistent, it's better to sign out completely
    if (reactAuthStatus !== supabaseAuthStatus) {
      console.log(
        "Manual fix didn't resolve inconsistency, redirecting to forced logout"
      );
      window.location.href = "/forced-logout";
    } else {
      console.log("Manual fix was successful");
      setAuthMismatch(false);
      setIsFixingAuth(false);
      window.location.reload();
    }
  };

  const handleEmergencyLogout = () => {
    // Redirect to the forced logout page
    window.location.href = "/forced-logout";
  };

  const handleSuperEmergencyLogout = () => {
    // Redirect to the emergency logout page
    window.location.href = "/emergency-logout";
  };

  return (
    <header className="bg-white dark:bg-gray-900 relative shadow-sm">
      {/* Subtle gradient border replacement */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-blue-100 via-indigo-200 to-purple-100 dark:from-blue-900 dark:via-indigo-700 dark:to-purple-900"></div>

      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
        >
          AI Article Summarizer
        </Link>

        <div className="flex items-center gap-4">
          {/* Only show auth mismatch banner if auto-fix has been attempted and failed */}
          {authMismatch && fixCounter >= 1 && (
            <div className="px-4 py-1 bg-yellow-100 border border-yellow-300 rounded-md flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-xs text-yellow-800">
                Authentication State Mismatch
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleFixAuth}
                disabled={isFixingAuth}
                className="text-xs ml-2 bg-white"
              >
                {isFixingAuth ? (
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1" />
                )}
                {isFixingAuth ? "Fixing..." : "Fix Now"}
              </Button>
            </div>
          )}

          {/* Only show Debug button for wyndo.mitra@gmail.com */}
          {user && user.email === "wyndo.mitra@gmail.com" && (
            <Link
              href="/debug"
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1"
              >
                <Bug className="h-3 w-3" />
                Debug
              </Button>
            </Link>
          )}

          {isAuthenticated ? (
            <>
              {/* Only show Logout button for wyndo.mitra@gmail.com */}
              {user && user.email === "wyndo.mitra@gmail.com" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEmergencyLogout}
                  className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="h-3 w-3 mr-1" />
                  Logout
                </Button>
              )}
              <UserProfile />
            </>
          ) : (
            !authMismatch &&
            !isFixingAuth && (
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs flex items-center gap-1"
                >
                  <UserIcon className="h-3 w-3" />
                  Login
                </Button>
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
}
