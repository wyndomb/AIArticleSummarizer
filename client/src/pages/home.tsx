import React from "react";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  summaryRequestSchema,
  type SummaryRequest,
  questionRequestSchema,
  type QuestionRequest,
} from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, apiRequestLock } from "@/lib/queryClient";
import { forceLogout } from "@/lib/supabase";
import { useAuthDebug } from "@/hooks/use-auth-debug";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  CopyIcon,
  Loader2,
  LinkIcon,
  SendIcon,
  BookOpenIcon,
  HelpCircleIcon,
  BookmarkIcon,
  RefreshCwIcon,
  ListChecksIcon,
  SaveIcon,
  AlertTriangle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { useIsMobile } from "@/hooks/use-mobile";

// Helper function for timestamp logs
const logWithTimestamp = (message: string) => {
  const timestamp = new Date().toISOString().substr(11, 12); // HH:MM:SS.mmm
  console.log(`[${timestamp}] HOME: ${message}`);
};

// Add this helper function for token refresh and retry
const refreshTokenAndRetry = async (
  operation: () => Promise<any>,
  refreshTokenFunc: () => Promise<boolean>,
  maxRetries: number = 2
): Promise<any> => {
  let retries = 0;

  const executeWithRetry = async (): Promise<any> => {
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
            `🔄 Auth error detected, refreshing token and retrying (${retries}/${maxRetries})`
          );

          // Try to refresh the auth token using the new mechanism
          try {
            const refreshSuccess = await refreshTokenFunc();
            if (refreshSuccess) {
              logWithTimestamp("✅ Token refreshed successfully");
              // Add a small delay to ensure token propagation
              await new Promise((resolve) => setTimeout(resolve, 500));
              return executeWithRetry();
            } else {
              logWithTimestamp("❌ Token refresh failed, retrying anyway");
              await new Promise((resolve) => setTimeout(resolve, 800));
              return executeWithRetry();
            }
          } catch (refreshError) {
            logWithTimestamp(`❌ Error refreshing token: ${refreshError}`);
            if (retries < maxRetries) {
              // Add an incremental backoff delay
              const backoffDelay = 1000 * retries;
              logWithTimestamp(
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

export default function Home() {
  // Use our debug hook to monitor authentication state
  const auth = useAuthDebug();
  const {
    isAuthenticated,
    user,
    session,
    isLoading,
    isAuthReady,
    waitForAuthReady,
    refreshAuthState,
    refreshToken,
  } = useAuth();
  const { toast } = useToast();
  const [analysisResult, setAnalysisResult] = useState<string>("");
  const [questionResult, setQuestionResult] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("analyze");
  const [sharedUrl, setSharedUrl] = useState<string>("");
  const [articleProcessed, setArticleProcessed] = useState<boolean>(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMobile = useIsMobile();

  // Track page load time
  const pageLoadTime = useRef<number>(Date.now());

  // Add a flag to track if this is a first login session
  const isFirstLoginSession = useRef<boolean>(
    !localStorage.getItem("app_has_logged_in_before") ||
      sessionStorage.getItem("is_first_login") === "true"
  );

  // Track loading state for auth initialization
  const [authInitializing, setAuthInitializing] = useState<boolean>(
    !isAuthReady
  );

  useEffect(() => {
    // Log component mounting
    logWithTimestamp("📄 Home component mounted");

    // Check auth ready state
    if (!isAuthReady) {
      logWithTimestamp("🔄 Waiting for auth to be ready...");
      setAuthInitializing(true);

      // Set up an interval to check auth state
      const checkAuthInterval = setInterval(() => {
        if (isAuthReady) {
          logWithTimestamp("✅ Auth is now ready!");
          setAuthInitializing(false);
          clearInterval(checkAuthInterval);
        }
      }, 100);

      // Clean up interval
      return () => {
        clearInterval(checkAuthInterval);
      };
    } else {
      logWithTimestamp("✅ Auth is already ready on mount");
      setAuthInitializing(false);
    }

    // Check if this is first login session
    if (isFirstLoginSession.current) {
      logWithTimestamp("👤 First login session detected");

      // Show a special toast for first login
      toast({
        title: "Welcome!",
        description:
          "This is your first login. Please allow a moment for setup.",
        duration: 5000,
      });
    }

    return () => {
      logWithTimestamp("📄 Home component unmounting");
    };
  }, [toast, isAuthReady]);

  // Update auth initializing state when isAuthReady changes
  useEffect(() => {
    if (isAuthReady && authInitializing) {
      logWithTimestamp("🔓 Auth is now ready, updating component state");
      setAuthInitializing(false);

      // Show a ready toast if we were initializing
      toast({
        title: "Ready",
        description: "You can now use the application",
        duration: 2000,
      });
    }
  }, [isAuthReady, authInitializing, toast]);

  // Form for structured analysis
  const analysisForm = useForm<SummaryRequest>({
    resolver: zodResolver(summaryRequestSchema),
    defaultValues: {
      url: "",
      instructions: "",
    },
  });

  // Form for asking questions
  const questionForm = useForm<QuestionRequest>({
    resolver: zodResolver(questionRequestSchema),
    defaultValues: {
      url: "",
      question: "",
    },
  });

  // Update forms when shared URL changes
  useEffect(() => {
    if (sharedUrl) {
      analysisForm.setValue("url", sharedUrl);
      questionForm.setValue("url", sharedUrl);
    }
  }, [sharedUrl, analysisForm, questionForm]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Structured analysis mutation with proper auth waiting
  const analysisMutation = useMutation({
    mutationFn: async (data: SummaryRequest) => {
      try {
        // Use our token refresh and retry helper
        const result = await refreshTokenAndRetry(
          async () => {
            // Validate URL
            try {
              new URL(data.url);
            } catch (e) {
              logWithTimestamp(`❌ Invalid URL: ${data.url}`);
              throw new Error("Please enter a valid URL");
            }

            // Track when we start the request
            const requestStartTime = Date.now();

            logWithTimestamp(
              `🔍 Starting analysis request for URL: ${data.url}`
            );
            logWithTimestamp(
              `Auth state: Ready=${isAuthReady}, Authenticated=${isAuthenticated}`
            );
            logWithTimestamp(
              `API lock state: ${apiRequestLock.isReady ? "Ready" : "Locked"}`
            );

            // First, ensure auth is ready before proceeding
            if (!isAuthReady) {
              logWithTimestamp(
                "⏳ Waiting for auth to be ready before proceeding with request"
              );
              try {
                await waitForAuthReady();
                logWithTimestamp(
                  "✅ Auth is now ready, proceeding with request"
                );
              } catch (error) {
                logWithTimestamp(`❌ Auth ready wait failed: ${error}`);
                logWithTimestamp("Proceeding with request anyway");
              }
            }

            // If the API lock is not ready, wait for it
            if (!apiRequestLock.isReady) {
              logWithTimestamp(
                "⏳ API request lock is not ready, waiting before proceeding"
              );
              try {
                await apiRequestLock.waitUntilReady();
                logWithTimestamp("✅ API request lock is now ready");
              } catch (error) {
                logWithTimestamp(
                  `⚠️ API lock wait timed out: ${error}, proceeding anyway`
                );
              }
            }

            // Check if we're properly authenticated before making the request
            if (!isAuthenticated) {
              logWithTimestamp(
                "⚠️ Not authenticated, attempting to refresh auth state"
              );
              await refreshAuthState();

              // If still not authenticated after refresh, throw error
              if (!isAuthenticated) {
                logWithTimestamp("❌ Authentication refresh failed");
                throw new Error(
                  "Authentication required. Please log in again."
                );
              }
            }

            try {
              // Make the API request
              const res = await apiRequest("POST", "/api/summarize", {
                url: data.url,
                instructions: data.instructions,
              });

              logWithTimestamp(`📊 API Response status: ${res.status}`);

              if (!res.ok) {
                // Handle authentication errors specifically
                if (res.status === 401 || res.status === 403) {
                  logWithTimestamp(`🔒 Authentication error: ${res.status}`);
                  throw new Error(`Authentication error: ${res.status}`);
                }

                // Handle other errors
                const errorText = await res.text();
                logWithTimestamp(`❌ API error: ${res.status} - ${errorText}`);

                // Try to parse as JSON if possible
                try {
                  const errorData = JSON.parse(errorText);
                  throw new Error(
                    errorData.message ||
                      `Error ${res.status}: ${res.statusText}`
                  );
                } catch (parseError) {
                  throw new Error(
                    `Error ${res.status}: ${errorText || res.statusText}`
                  );
                }
              }

              // Process successful response
              logWithTimestamp("✅ API request successful, parsing response");
              const result = await res.json();
              setArticleProcessed(true);

              if (!result || !result.summary) {
                logWithTimestamp("❌ API returned success but no summary data");
                throw new Error(
                  "The API returned a successful response but no summary data"
                );
              }

              logWithTimestamp(
                `✅ Successfully received summary of length: ${result.summary.length}`
              );
              return result.summary;
            } catch (error) {
              logWithTimestamp(`❌ Request execution error: ${error}`);
              throw error;
            }
          },
          refreshToken,
          2
        );

        return result;
      } catch (error) {
        logWithTimestamp(`❌ Analysis mutation outer error: ${error}`);
        throw error;
      }
    },
    onSuccess: (data) => {
      logWithTimestamp(
        `✅ Analysis mutation successful, summary length: ${data.length}`
      );
      setAnalysisResult(data);
      toast({
        title: "Analysis complete",
        description: "Your article has been analyzed successfully.",
      });
    },
    onError: (error: Error) => {
      logWithTimestamp(`❌ Analysis mutation error: ${error.message}`);
      toast({
        title: "Analysis failed",
        description:
          error.message || "An error occurred while analyzing the article.",
        variant: "destructive",
      });
    },
  });

  // Simplified mutation for asking questions
  const questionMutation = useMutation({
    mutationFn: async (data: QuestionRequest) => {
      // Validate URL
      try {
        new URL(data.url);
      } catch (e) {
        throw new Error("Please enter a valid URL");
      }

      // Track when we start the request
      const requestStartTime = Date.now();
      const timeSincePageLoad = requestStartTime - pageLoadTime.current;

      logWithTimestamp(
        `❓ Starting question request (${timeSincePageLoad}ms since page load)`
      );
      logWithTimestamp(
        `URL: ${data.url}, Question: ${data.question.substring(0, 50)}...`
      );
      logWithTimestamp(
        `API lock status: ${apiRequestLock.isReady ? "Ready" : "Locked"}`
      );

      // Simple direct API request - the apiRequest function now handles waiting for auth
      const res = await apiRequest("POST", "/api/ask", data);

      if (!res.ok) {
        const errorText = await res.text();

        // Check for authentication-related errors
        if (res.status === 401 || res.status === 403) {
          logWithTimestamp(
            `🔒 Authentication error on question: ${res.status}`
          );
          throw new Error(
            "Authentication error. Please refresh the page and try again."
          );
        }

        // Log timing for non-successful requests
        logWithTimestamp(
          `❌ Question request failed after ${
            Date.now() - requestStartTime
          }ms with status ${res.status}`
        );

        throw new Error(errorText || `Error ${res.status}`);
      }

      // Log timing for successful requests
      logWithTimestamp(
        `✅ Question request completed successfully after ${
          Date.now() - requestStartTime
        }ms`
      );

      return res.json();
    },
    onSuccess: (data) => {
      setQuestionResult(data.answer);
      toast({
        title: "Question answered",
        description: "Your question has been answered based on the article.",
      });
    },
    onError: (error: Error) => {
      logWithTimestamp(`❌ Question error: ${error.message}`);

      // Check if it might be an auth-related error
      if (
        error.message.toLowerCase().includes("auth") ||
        error.message.includes("401") ||
        error.message.includes("403")
      ) {
        toast({
          title: "Session error",
          description:
            "Your session may have expired. Try refreshing the page.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error answering question",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const onAnalysisSubmit = (data: SummaryRequest) => {
    // Do not allow submissions while auth is initializing
    if (authInitializing) {
      toast({
        title: "Please wait",
        description:
          "The application is still initializing. Please wait a moment.",
        variant: "destructive",
      });
      return;
    }

    // Log the submission
    logWithTimestamp(`📝 Analysis submission with URL: ${data.url}`);

    // Save the URL for other components
    setSharedUrl(data.url);

    // Proceed with analysis
    analysisMutation.mutate({
      url: data.url,
      instructions: data.instructions || "",
    });
  };

  const onQuestionSubmit = (data: QuestionRequest) => {
    questionMutation.mutate({
      ...data,
      url: sharedUrl || data.url,
    });
  };

  const handleCopy = async () => {
    try {
      const currentResult =
        activeTab === "analyze" ? analysisResult : questionResult;
      await navigator.clipboard.writeText(currentResult);
      toast({
        title: "Copied to clipboard",
        description: "Content has been copied to your clipboard.",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try copying manually.",
        variant: "destructive",
      });
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const getCurrentResult = () => {
    return activeTab === "analyze" ? analysisResult : questionResult;
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sharedUrl) {
      toast({
        title: "URL Required",
        description: "Please enter a valid article URL.",
        variant: "destructive",
      });
      return;
    }

    logWithTimestamp(`🔗 URL submit handler called with: ${sharedUrl}`);

    // Always set the URL in the form
    analysisForm.setValue("url", sharedUrl);

    // Use the form submit handler to ensure all validation runs
    onAnalysisSubmit({
      url: sharedUrl,
      instructions: analysisForm.getValues("instructions") || "",
    });
  };

  const handleRegenerateSummary = () => {
    if (!sharedUrl) {
      toast({
        title: "URL Required",
        description: "Please enter a valid article URL.",
        variant: "destructive",
      });
      return;
    }

    logWithTimestamp(`🔄 Regenerate summary handler called: ${sharedUrl}`);
    logWithTimestamp(
      `API lock status: ${apiRequestLock.isReady ? "Ready" : "Locked"}`
    );

    // If the API lock is not ready, show a message but still allow the regeneration
    if (!apiRequestLock.isReady) {
      toast({
        title: "Initializing...",
        description:
          "Your session is still initializing. We'll process your request as soon as it's ready.",
        duration: 5000,
      });
    }

    // Always proceed with the regeneration - the apiRequest function will handle waiting
    analysisMutation.mutate({
      url: sharedUrl,
      instructions: "",
    });
  };

  // Simple logout that doesn't trigger refresh loops
  const handleForceLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      // Fallback handling
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/login";
    }
  };

  // Show loading state if auth is still initializing
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // URL Input Card Component
  const UrlInputCard = () => (
    <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden mb-8">
      <CardHeader className="bg-white border-b border-slate-100 pb-4">
        <CardTitle className="text-slate-800 font-semibold">
          Enter Article URL
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleUrlSubmit} className="space-y-5">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <LinkIcon className="h-4 w-4" />
            </div>
            <Input
              placeholder="https://example.com/article"
              className="pl-10 bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 placeholder:text-slate-400 placeholder:opacity-60"
              value={sharedUrl}
              onChange={(e) => setSharedUrl(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors"
            disabled={analysisMutation.isPending}
          >
            {analysisMutation.isPending ? (
              <div className="flex items-center justify-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Analyzing Article...</span>
              </div>
            ) : (
              <span>Summarize</span>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );

  // Features Section Component
  const FeaturesSection = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <Card className="bg-white border border-slate-200 shadow-sm">
        <CardContent className="p-4 flex flex-col items-center text-center">
          <div className="bg-blue-50 rounded-full p-3 mb-3">
            <ListChecksIcon className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-slate-800 mb-1">
            Instant Summaries
          </h3>
          <p className="text-sm text-slate-600">
            Get concise AI-generated summaries of any article in seconds
          </p>
        </CardContent>
      </Card>
      <Card className="bg-white border border-slate-200 shadow-sm">
        <CardContent className="p-4 flex flex-col items-center text-center">
          <div className="bg-blue-50 rounded-full p-3 mb-3">
            <HelpCircleIcon className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-slate-800 mb-1">Ask Questions</h3>
          <p className="text-sm text-slate-600">
            Explore deeper by asking specific questions about the article
            content
          </p>
        </CardContent>
      </Card>
      <Card className="bg-white border border-slate-200 shadow-sm">
        <CardContent className="p-4 flex flex-col items-center text-center">
          <div className="bg-blue-50 rounded-full p-3 mb-3">
            <SaveIcon className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-slate-800 mb-1">Save & Share</h3>
          <p className="text-sm text-slate-600">
            Copy summaries and answers to save or share with others
          </p>
        </CardContent>
      </Card>
    </div>
  );

  // Add this effect near the beginning, with the other useEffects
  useEffect(() => {
    // Check if the API is available
    const checkApiAvailability = async () => {
      try {
        logWithTimestamp("🔍 Checking API availability...");
        const response = await fetch("/api/health", { method: "GET" });

        if (response.ok) {
          logWithTimestamp("✅ API health check successful");
        } else {
          logWithTimestamp(`⚠️ API health check failed: ${response.status}`);
          // Show a warning toast but don't block the UI
          toast({
            title: "API Warning",
            description:
              "The API service might be experiencing issues. Summarization may not work correctly.",
            variant: "destructive",
            duration: 6000,
          });
        }
      } catch (error) {
        logWithTimestamp(`❌ API health check error: ${error}`);
        toast({
          title: "API Connection Error",
          description:
            "Cannot connect to the API. Please check your network connection.",
          variant: "destructive",
          duration: 6000,
        });
      }
    };

    // Run the check when the component mounts
    checkApiAvailability();
  }, [toast]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 rounded-full p-6 inline-flex">
              <BookmarkIcon className="h-10 w-10 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2">
            Article Summarizer & Assistant
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Paste an article URL to get an AI-generated summary and ask
            questions about the content.
          </p>
        </header>

        {/* Conditionally render based on device type */}
        {isMobile ? (
          <>
            <UrlInputCard />
            <FeaturesSection />
          </>
        ) : (
          <>
            <FeaturesSection />
            <UrlInputCard />
          </>
        )}

        <div className="grid gap-8">
          {articleProcessed && (
            <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
              <Tabs
                defaultValue="analyze"
                onValueChange={handleTabChange}
                className="w-full"
              >
                <CardHeader className="bg-white border-b border-slate-100 p-0">
                  <div className="px-6 pt-6 pb-4">
                    <TabsList className="grid grid-cols-2 w-full bg-slate-100/80 p-1 rounded-lg">
                      <TabsTrigger
                        value="analyze"
                        className="flex items-center justify-center gap-2 rounded-md py-2.5 font-medium text-slate-700 transition-all data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
                      >
                        <BookOpenIcon className="h-4 w-4" />
                        <span>Summary</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="ask"
                        className="flex items-center justify-center gap-2 rounded-md py-2.5 font-medium text-slate-700 transition-all data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
                      >
                        <HelpCircleIcon className="h-4 w-4" />
                        <span>Ask Questions</span>
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  <TabsContent value="analyze" className="mt-0">
                    {/* Summary tab content is now empty since we removed the custom instructions */}
                  </TabsContent>

                  <TabsContent value="ask" className="mt-0">
                    <Form {...questionForm}>
                      <form
                        onSubmit={questionForm.handleSubmit(onQuestionSubmit)}
                        className="space-y-5"
                      >
                        <FormField
                          control={questionForm.control}
                          name="question"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-700 font-medium">
                                Your Question
                              </FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Ask anything about the article, e.g., 'What are the main arguments against this position?' or 'Explain the technical aspects in simpler terms.'"
                                  className="bg-white min-h-[120px] border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 resize-none"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage className="text-red-500" />
                            </FormItem>
                          )}
                        />

                        <Button
                          type="submit"
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                          disabled={questionMutation.isPending}
                        >
                          {questionMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Processing Question...</span>
                            </>
                          ) : (
                            <>
                              <SendIcon className="h-4 w-4" />
                              <span>Get Answer</span>
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          )}

          {getCurrentResult() && (
            <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between bg-white border-b border-slate-100 py-4">
                <CardTitle className="text-slate-800 font-semibold">
                  {activeTab === "analyze" ? "Article Summary" : "Answer"}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {activeTab === "analyze" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRegenerateSummary}
                      disabled={analysisMutation.isPending}
                      className="h-8 px-3 text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-700 flex items-center gap-1.5"
                    >
                      {analysisMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCwIcon className="h-3.5 w-3.5" />
                      )}
                      <span>Regenerate</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="h-8 px-3 text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-700 flex items-center gap-1.5"
                  >
                    <CopyIcon className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="prose prose-slate prose-blue max-w-none">
                  <ReactMarkdown>{getCurrentResult()}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
