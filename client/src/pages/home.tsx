import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { summaryRequestSchema, type SummaryRequest } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CopyIcon, Loader2 } from "lucide-react";

export default function Home() {
  const { toast } = useToast();
  const [summary, setSummary] = useState<string>("");

  const form = useForm<SummaryRequest>({
    resolver: zodResolver(summaryRequestSchema),
    defaultValues: {
      content: "",
      url: "",
      instructions: "",
    },
  });

  const summarizeMutation = useMutation({
    mutationFn: async (data: SummaryRequest) => {
      const res = await apiRequest("POST", "/api/summarize", data);
      return res.json();
    },
    onSuccess: (data) => {
      setSummary(data.summary);
      toast({
        title: "Summary generated successfully",
        description: "Your article has been summarized.",
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

  const onSubmit = (data: SummaryRequest) => {
    summarizeMutation.mutate(data);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      toast({
        title: "Copied to clipboard",
        description: "Summary has been copied to your clipboard.",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try copying manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#F7FAFC] p-6">
      <div className="max-w-[680px] mx-auto space-y-6">
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#2D3748]">Article Summarizer</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Article Content</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Paste your article content here..."
                          className="min-h-[200px] bg-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Article URL (optional)</FormLabel>
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
                  control={form.control}
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
                  disabled={summarizeMutation.isPending}
                >
                  {summarizeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Summary...
                    </>
                  ) : (
                    "Generate Summary"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {summary && (
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-[#2D3748]">Summary</CardTitle>
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
              <div className="prose max-w-none">
                <p className="text-[#1A202C]">{summary}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}