import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { LoginButton } from "@/components/auth/LoginButton";
import { useAuth } from "@/lib/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertTriangle,
  CheckCircle,
  Bug,
  AlertOctagon,
  BookOpenIcon,
  ClockIcon,
  BrainIcon,
  MessageCircleQuestionIcon,
  BookmarkIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [clearingAuth, setClearingAuth] = useState(false);
  const [authCleared, setAuthCleared] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showEmergencyOptions, setShowEmergencyOptions] = useState(false);
  const [supabaseUser, setSupabaseUser] = useState<any>(null);

  // Parse URL parameters
  const params = new URLSearchParams(location.split("?")[1] || "");

  // Check for forcedLogout parameter
  const isForcedLogout = params.get("forcedLogout") === "true";
  const logoutReason = params.get("reason") || "";
  const errorParam = params.get("error");

  // Setup first login detection
  useEffect(() => {
    // Check if this could be a first login attempt
    const hasLoggedInBefore = localStorage.getItem("app_has_logged_in_before");

    if (!hasLoggedInBefore) {
      console.log("Login page: First login scenario detected");

      // Clear any stored session data to ensure a clean state
      // Get the Supabase storage key
      const supabaseKey =
        "sb-" +
        import.meta.env.VITE_SUPABASE_URL.split("//")[1].split(".")[0] +
        "-auth-token";

      // Check if we have an orphaned token
      const hasStoredToken = localStorage.getItem(supabaseKey) !== null;

      if (hasStoredToken) {
        console.log("Clearing orphaned token for first login");
        localStorage.removeItem(supabaseKey);
      }

      // Any other first login setup can be done here
    } else {
      console.log("Login page: Returning user detected");
    }
  }, []);

  // Set appropriate error message based on URL parameters
  useEffect(() => {
    if (errorParam === "auth-error") {
      setErrorMessage("Authentication failed. Please try again.");
      setShowEmergencyOptions(true);
    } else if (logoutReason === "auth_loop") {
      setErrorMessage(
        "Authentication loop detected and fixed. Please try logging in again."
      );
      setShowEmergencyOptions(true);
    } else if (isForcedLogout) {
      setErrorMessage(
        "You were logged out due to an authentication issue. Please sign in again."
      );
      setShowEmergencyOptions(true);
    }
  }, [errorParam, isForcedLogout, logoutReason]);

  // Directly check Supabase session
  useEffect(() => {
    const checkDirectSession = async () => {
      try {
        console.log("Login page: Checking direct Supabase session");

        // Get the Supabase storage key
        const supabaseKey =
          "sb-" +
          import.meta.env.VITE_SUPABASE_URL.split("//")[1].split(".")[0] +
          "-auth-token";

        // Check localStorage for token
        const hasStoredToken = localStorage.getItem(supabaseKey) !== null;

        // Get session from Supabase
        const { data } = await supabase.auth.getSession();
        setSupabaseUser(data.session?.user || null);

        // Check for various potential auth state issues

        // Case 1: Supabase has session but React doesn't (context mismatch)
        if (data.session?.user && !isLoading && !isAuthenticated) {
          console.log(
            "Session found in Supabase but React context not updated"
          );

          // Clear any flags that might be causing issues
          [
            "last_direct_auth_check",
            "last_critical_auth_check",
            "last_sync_auth_check",
            "auth_check_count",
            "auth_fix_attempt",
            "is_fixing_auth",
            "auth_fix_in_progress",
            "disable_auth_listeners",
            "auth_loop_reset",
            "auth_loop_detected",
          ].forEach((key) => {
            sessionStorage.removeItem(key);
          });

          console.log(
            "Cleaned up session flags, will reload to re-initialize auth"
          );
          // Use a small delay to ensure cleanup is complete
          setTimeout(() => {
            window.location.reload();
          }, 100);
          return;
        }

        // Case 2: No Supabase session but localStorage has token (orphaned token)
        if (!data.session && hasStoredToken) {
          console.log(
            "No Supabase session but found orphaned token in localStorage"
          );

          // Check if we were sent here specifically to clean up
          const forcedLogout = params.get("forcedLogout") === "true";
          const cleanStart = params.get("clean") === "true";

          if (forcedLogout || cleanStart) {
            console.log(
              "Forced logout or clean start requested, clearing auth data"
            );
            await handleClearAuth();
            return;
          } else {
            // Just remove the orphaned token
            console.log("Removing orphaned token");
            localStorage.removeItem(supabaseKey);
          }
        }

        // Case 3: Everything is fine, we have a valid session
        if (data.session && !isLoading) {
          console.log("Valid session exists in Supabase, redirecting to home");
          // Redirect to home with a short delay to allow context to update
          setTimeout(() => {
            setLocation("/");
          }, 500);
        }
      } catch (error) {
        console.error("Error checking Supabase session:", error);
        setErrorMessage(
          "Failed to verify authentication state. Please try again."
        );
      }
    };

    checkDirectSession();
  }, [isAuthenticated, isLoading, setLocation]);

  // Redirect to home page if authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      console.log("Auth context shows authenticated, redirecting to home");
      setLocation("/");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  // Add an effect to handle clean-start parameter
  useEffect(() => {
    // Check for clean parameter which indicates we need to ensure clean auth state
    const cleanStart = params.get("clean") === "true";

    if (cleanStart && !clearingAuth && !authCleared) {
      console.log("Clean start requested, clearing auth state");
      handleClearAuth();
    }
  }, [params]);

  // Function to clear authentication data
  const handleClearAuth = async () => {
    console.log("Starting comprehensive auth cleanup");
    setClearingAuth(true);
    try {
      // First try to sign out from Supabase
      try {
        const { error } = await supabase.auth.signOut({ scope: "global" });
        if (error) {
          console.error("Error signing out from Supabase:", error);
        } else {
          console.log("Successfully signed out from Supabase");
        }
      } catch (signOutError) {
        console.error("Exception during Supabase signOut:", signOutError);
      }

      // Get Supabase storage key
      const supabaseKey =
        "sb-" +
        import.meta.env.VITE_SUPABASE_URL.split("//")[1].split(".")[0] +
        "-auth-token";

      // Clear specific Supabase token first
      try {
        if (localStorage.getItem(supabaseKey)) {
          localStorage.removeItem(supabaseKey);
          console.log(`Specifically removed ${supabaseKey} from localStorage`);
        }
      } catch (e) {
        console.error("Error removing Supabase token:", e);
      }

      // Clear critical auth flags from sessionStorage
      [
        "last_direct_auth_check",
        "last_critical_auth_check",
        "last_sync_auth_check",
        "auth_check_count",
        "auth_fix_attempt",
        "is_fixing_auth",
        "auth_fix_in_progress",
        "disable_auth_listeners",
        "auth_loop_reset",
        "auth_loop_detected",
      ].forEach((key) => {
        try {
          if (sessionStorage.getItem(key)) {
            sessionStorage.removeItem(key);
            console.log(`Removed ${key} from sessionStorage`);
          }
        } catch (e) {
          console.error(`Failed to remove ${key}`, e);
        }
      });

      // Clear all localStorage items related to auth
      try {
        Object.keys(localStorage).forEach((key) => {
          if (
            key.includes("supabase") ||
            key.includes("auth") ||
            key.includes("sb-")
          ) {
            localStorage.removeItem(key);
            console.log(`Removed ${key} from localStorage`);
          }
        });
      } catch (localError) {
        console.error("Error clearing localStorage:", localError);
      }

      // Clear all sessionStorage items related to auth
      try {
        Object.keys(sessionStorage).forEach((key) => {
          if (key.includes("supabase") || key.includes("auth")) {
            sessionStorage.removeItem(key);
            console.log(`Removed ${key} from sessionStorage`);
          }
        });
      } catch (sessionError) {
        console.error("Error clearing sessionStorage:", sessionError);
      }

      // Try to clear cookies
      try {
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(
              /=.*/,
              "=;expires=" + new Date().toUTCString() + ";path=/"
            );
        });
        console.log("Cleared cookies");
      } catch (cookieError) {
        console.error("Error clearing cookies:", cookieError);
      }

      // Set flag to indicate success
      setAuthCleared(true);
      setClearingAuth(false);
      console.log("Auth cleanup complete");

      // Reload the page with cleared parameter to indicate success
      setTimeout(() => {
        window.location.href = "/login?cleared=true&t=" + Date.now();
      }, 1000);
    } catch (error) {
      console.error("Error during auth cleanup:", error);
      setClearingAuth(false);
      setErrorMessage("Failed to clear authentication. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Hero Section */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-16 md:py-24 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center bg-blue-50 text-blue-700 rounded-full px-4 py-1.5 text-sm font-medium mb-2">
                <SparklesIcon className="h-4 w-4 mr-1.5" />
                AI-Powered Article Assistant
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-800 leading-tight">
                Understand any article in seconds with AI
              </h1>
              <p className="text-lg text-slate-600">
                Save time and enhance your reading experience with instant
                article summaries, insightful answers to your questions, and
                seamless content sharing.
              </p>

              <div className="pt-4">
                <Card className="w-full max-w-md shadow-sm hover:shadow-md transition-all duration-300 border-slate-200">
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-blue-700">
                      Get Started
                    </CardTitle>
                    <CardDescription className="text-slate-600 text-base">
                      Sign in to access unlimited summaries
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {errorMessage && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Authentication Issue</AlertTitle>
                        <AlertDescription>{errorMessage}</AlertDescription>
                      </Alert>
                    )}

                    {authCleared && (
                      <Alert
                        variant="default"
                        className="mb-4 bg-green-50 border-green-200"
                      >
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <AlertTitle>Success</AlertTitle>
                        <AlertDescription>
                          Authentication data cleared successfully. You can now
                          try signing in again.
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex flex-col gap-4">
                      <LoginButton
                        provider="google"
                        variant="primary"
                        className="py-6 text-base font-medium"
                      />
                    </div>
                  </CardContent>

                  {showEmergencyOptions && (
                    <CardFooter className="flex flex-col gap-4">
                      <div className="w-full border-t pt-4">
                        <p className="text-sm text-gray-500 mb-3">
                          Having trouble signing in?
                        </p>
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            className="w-full hover:bg-slate-100 transition-colors"
                            onClick={handleClearAuth}
                            disabled={clearingAuth || authCleared}
                          >
                            {clearingAuth ? (
                              <>
                                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                                Clearing...
                              </>
                            ) : (
                              "Clear Authentication Data"
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full hover:bg-slate-100 transition-colors"
                            onClick={() => setLocation("/debug")}
                          >
                            <Bug className="h-4 w-4 mr-2" /> Debug
                            Authentication
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full hover:bg-slate-100 transition-colors"
                            onClick={() => setLocation("/forced-logout")}
                          >
                            <AlertOctagon className="h-4 w-4 mr-2" /> Force
                            Logout
                          </Button>
                        </div>
                      </div>
                    </CardFooter>
                  )}
                </Card>
              </div>
            </div>

            <div className="rounded-lg shadow-xl border border-slate-200 overflow-hidden bg-white hidden md:block">
              <img
                src="/assets/app-screenshot.png"
                alt="AI Summarizer App"
                className="w-full h-auto"
                onError={(e) => {
                  e.currentTarget.src =
                    "https://placehold.co/800x600/e2e8f0/1e293b?text=AI+Summarizer+App";
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">
            How It Works
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Our AI-powered platform processes any article to deliver concise
            summaries and intelligent responses to your questions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <BookOpenIcon className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
              Instant Summaries
            </h3>
            <p className="text-slate-600">
              Paste any article URL and get a concise AI-generated summary
              within seconds, highlighting the key points.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <MessageCircleQuestionIcon className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
              Ask Questions
            </h3>
            <p className="text-slate-600">
              Explore deeper by asking specific questions about the article
              content and get intelligent, contextual answers.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <BookmarkIcon className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
              Save & Share
            </h3>
            <p className="text-slate-600">
              Easily save, copy, and share your summaries and answers with
              others for collaborative research and reading.
            </p>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-slate-50 border-y border-slate-200 py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">
              Why Use Our AI Summarizer
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Designed to save you time and enhance your reading experience
              across any type of content.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex items-start">
              <div className="bg-blue-50 rounded-full p-3 mr-4">
                <ClockIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-1">
                  Save Time
                </h3>
                <p className="text-slate-600">
                  Extract key information from lengthy articles in seconds
                  instead of spending minutes or hours reading full text.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-blue-50 rounded-full p-3 mr-4">
                <BrainIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-1">
                  Enhance Comprehension
                </h3>
                <p className="text-slate-600">
                  Quickly grasp complex topics through concise summaries that
                  highlight main points and key arguments.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-blue-50 rounded-full p-3 mr-4">
                <SearchIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-1">
                  Research Efficiently
                </h3>
                <p className="text-slate-600">
                  Quickly evaluate sources by getting summaries before
                  committing to reading the full content.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-blue-50 rounded-full p-3 mr-4">
                <SparklesIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-1">
                  Powered by Advanced AI
                </h3>
                <p className="text-slate-600">
                  Utilize cutting-edge large language model technology to
                  process and understand content with human-like comprehension.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-8 text-center max-w-3xl mx-auto shadow-sm hover:shadow-md transition-all duration-300">
          <h2 className="text-2xl font-bold text-blue-700 mb-4">
            Ready to save time and read smarter?
          </h2>
          <p className="text-slate-600 mb-6 max-w-xl mx-auto">
            Join thousands of users who are already enhancing their reading
            experience with our AI summarizer.
          </p>
          <LoginButton
            provider="google"
            variant="primary"
            className="max-w-xs mx-auto py-6 text-base font-medium"
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center">
                <BookOpenIcon className="h-5 w-5 text-blue-600 mr-2" />
                <span className="font-bold text-slate-800">
                  AI Article Summarizer
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                © {new Date().getFullYear()} All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
