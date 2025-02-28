import { useState } from "react";
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
import { apiRequest } from "@/lib/queryClient";
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
import { CopyIcon, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const { toast } = useToast();
  const [analysisResult, setAnalysisResult] = useState<string>("");
  const [questionResult, setQuestionResult] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("analyze");

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

  // Mutation for structured analysis
  const analysisMutation = useMutation({
    mutationFn: async (data: SummaryRequest) => {
      const res = await apiRequest("POST", "/api/summarize", data);
      return res.json();
    },
    onSuccess: (data) => {
      setAnalysisResult(data.summary);
      toast({
        title: "Analysis generated successfully",
        description: "Your article has been analyzed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for asking questions
  const questionMutation = useMutation({
    mutationFn: async (data: QuestionRequest) => {
      try {
        // Validate URL format on client side before sending
        try {
          new URL(data.url);
        } catch (e) {
          throw new Error("Please enter a valid URL");
        }

        console.log("Sending question request:", data);
        const res = await apiRequest("POST", "/api/ask", data);

        // Check if response is OK
        if (!res.ok) {
          const errorText = await res.text();
          console.error("Server returned error:", res.status, errorText);
          throw new Error(`Server error: ${res.status} ${errorText}`);
        }

        const text = await res.text();
        console.log(
          "Received response:",
          text.substring(0, 200) + (text.length > 200 ? "..." : "")
        );

        // Try to parse JSON response
        try {
          return JSON.parse(text);
        } catch (e) {
          console.error("Failed to parse JSON response:", text);
          if (text.includes("<!DOCTYPE html>")) {
            throw new Error(
              "Server error occurred. The article might not be accessible or supported by the parser."
            );
          } else {
            throw new Error(
              `Invalid response from server: ${text.substring(
                0,
                100
              )}... Please try again.`
            );
          }
        }
      } catch (error) {
        console.error("Question mutation error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      setQuestionResult(data.answer);
      toast({
        title: "Question answered",
        description: "Your question has been answered based on the article.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onAnalysisSubmit = (data: SummaryRequest) => {
    analysisMutation.mutate(data);
  };

  const onQuestionSubmit = (data: QuestionRequest) => {
    questionMutation.mutate(data);
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

  return (
    <div className="min-h-screen bg-[#F7FAFC] p-6">
      <div className="max-w-[800px] mx-auto space-y-6">
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#2D3748]">
              AI Article Assistant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="analyze" onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="analyze">Structured Analysis</TabsTrigger>
                <TabsTrigger value="ask">Ask Questions</TabsTrigger>
              </TabsList>

              <TabsContent value="analyze">
                <Form {...analysisForm}>
                  <form
                    onSubmit={analysisForm.handleSubmit(onAnalysisSubmit)}
                    className="space-y-6"
                  >
                    <FormField
                      control={analysisForm.control}
                      name="url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Article URL</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://example.com/article"
                              className="bg-white"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={analysisForm.control}
                      name="instructions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Instructions (optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="E.g., Focus on technical details"
                              className="bg-white"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full bg-[#3182CE] hover:bg-[#2C5282]"
                      disabled={analysisMutation.isPending}
                    >
                      {analysisMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Extracting and Analyzing...
                        </>
                      ) : (
                        "Generate Analysis"
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="ask">
                <Form {...questionForm}>
                  <form
                    onSubmit={questionForm.handleSubmit(onQuestionSubmit)}
                    className="space-y-6"
                  >
                    <FormField
                      control={questionForm.control}
                      name="url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Article URL</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://example.com/article"
                              className="bg-white"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={questionForm.control}
                      name="question"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Question</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Ask anything about the article, e.g., 'What are the main arguments against this position?' or 'Explain the technical aspects in simpler terms.'"
                              className="bg-white min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full bg-[#3182CE] hover:bg-[#2C5282]"
                      disabled={questionMutation.isPending}
                    >
                      {questionMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing Question...
                        </>
                      ) : (
                        "Get Answer"
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {getCurrentResult() && (
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-[#2D3748]">
                {activeTab === "analyze" ? "Article Analysis" : "Answer"}
              </CardTitle>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="h-8 w-8"
              >
                <CopyIcon className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="prose prose-blue max-w-none">
                <ReactMarkdown>{getCurrentResult()}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
