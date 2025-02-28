import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { summaryRequestSchema, questionRequestSchema } from "@shared/schema";
// @ts-ignore - Ignore the type error for article-parser
import { extract } from "article-parser";
import { generateSummary, answerQuestion } from "./lib/openai";

export function registerRoutes(app: Express): Server {
  // Add a simple test route
  app.get("/api/test", (_req, res) => {
    res.json({ status: "ok", message: "Server is working correctly" });
  });

  app.post("/api/summarize", async (req, res) => {
    try {
      const validatedData = summaryRequestSchema.parse(req.body);

      if (!validatedData.url) {
        throw new Error("URL is required");
      }

      // Extract article content from URL
      const article = await extract(validatedData.url);
      if (!article || !article.content) {
        throw new Error("Could not extract article content from the URL");
      }

      // Create a temporary DOM element to parse HTML and get text content
      const cleanContent = article.content
        .replace(/<\/p>/gi, "\n\n") // Replace closing paragraph tags with double newlines
        .replace(/<br\s*\/?>/gi, "\n") // Replace <br> tags with single newlines
        .replace(/<[^>]*>/g, "") // Remove remaining HTML tags
        .replace(/\n\s*\n/g, "\n\n") // Normalize multiple newlines to double newlines
        .replace(/\s+/g, " ") // Replace multiple spaces with single space
        .split("\n\n") // Split into paragraphs
        .map((para: string) => para.trim()) // Trim each paragraph
        .filter((para: string) => para.length) // Remove empty paragraphs
        .join("\n\n") // Join paragraphs with double newlines
        .trim(); // Final trim

      // Get approximately 1000 words (around 6000 characters)
      const MAX_LENGTH = 6000;
      let truncatedContent = cleanContent;
      if (cleanContent.length > MAX_LENGTH) {
        // Find the last complete paragraph within the limit
        truncatedContent = cleanContent.substr(0, MAX_LENGTH);
        const lastParaBreak = truncatedContent.lastIndexOf("\n\n");
        if (lastParaBreak > MAX_LENGTH * 0.8) {
          // Only cut at paragraph if it's not too short
          truncatedContent = truncatedContent.substr(0, lastParaBreak);
        } else {
          // Otherwise cut at the last word
          truncatedContent = truncatedContent.substr(
            0,
            Math.min(truncatedContent.length, truncatedContent.lastIndexOf(" "))
          );
        }
        truncatedContent += "...";
      }

      // Generate AI summary
      const aiSummary = await generateSummary(
        truncatedContent,
        validatedData.instructions
      );

      const result = await storage.createSummary({
        content: cleanContent,
        url: validatedData.url,
        instructions: validatedData.instructions || null,
        summary: aiSummary,
      });

      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ message });
    }
  });

  app.post("/api/ask", async (req, res) => {
    try {
      console.log("Received question request:", req.body);
      const validatedData = questionRequestSchema.parse(req.body);

      if (!validatedData.url) {
        throw new Error("URL is required");
      }

      if (!validatedData.question) {
        throw new Error("Question is required");
      }

      console.log("Extracting article from URL:", validatedData.url);

      // Validate URL format
      let url;
      try {
        url = new URL(validatedData.url);
        // Normalize the URL to ensure consistent format
        validatedData.url = url.toString();
      } catch (error) {
        throw new Error("Invalid URL format");
      }

      // Extract article content from URL
      let article;
      try {
        article = await extract(validatedData.url);
        console.log(
          "Article extraction result:",
          article ? "Success" : "Failed"
        );

        if (article) {
          console.log("Article title:", article.title);
          console.log("Article author:", article.author || "Unknown");
          console.log(
            "Content length:",
            article.content ? article.content.length : 0
          );
        } else {
          console.log("No article data returned");
        }
      } catch (error: unknown) {
        console.error("Error extracting article:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(
          `Could not extract article content from the URL: ${errorMessage}`
        );
      }

      if (!article || !article.content) {
        throw new Error(
          "Could not extract article content from the URL. Please make sure the URL points to a valid article."
        );
      }

      // Clean the content
      const cleanContent = article.content
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/\n\s*\n/g, "\n\n")
        .replace(/\s+/g, " ")
        .split("\n\n")
        .map((para: string) => para.trim())
        .filter((para: string) => para.length)
        .join("\n\n")
        .trim();

      // Get approximately 1000 words (around 6000 characters)
      const MAX_LENGTH = 6000;
      let truncatedContent = cleanContent;
      if (cleanContent.length > MAX_LENGTH) {
        truncatedContent = cleanContent.substr(0, MAX_LENGTH);
        const lastParaBreak = truncatedContent.lastIndexOf("\n\n");
        if (lastParaBreak > MAX_LENGTH * 0.8) {
          truncatedContent = truncatedContent.substr(0, lastParaBreak);
        } else {
          truncatedContent = truncatedContent.substr(
            0,
            Math.min(truncatedContent.length, truncatedContent.lastIndexOf(" "))
          );
        }
        truncatedContent += "...";
      }

      // Generate AI answer to the question
      console.log("Generating AI answer to question:", validatedData.question);
      const aiAnswer = await answerQuestion(
        truncatedContent,
        validatedData.question
      );
      console.log("AI answer generated successfully");

      const result = await storage.createQuestion({
        content: cleanContent,
        url: validatedData.url,
        question: validatedData.question,
        answer: aiAnswer,
      });

      console.log("Sending response to client");
      res.json(result);
    } catch (error: unknown) {
      console.error("Error in /api/ask route:", error);
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ message });
    }
  });

  app.get("/api/summaries", async (_req, res) => {
    const summaries = await storage.getSummaries();
    res.json(summaries);
  });

  app.get("/api/questions", async (_req, res) => {
    const questions = await storage.getQuestions();
    res.json(questions);
  });

  const httpServer = createServer(app);
  return httpServer;
}
