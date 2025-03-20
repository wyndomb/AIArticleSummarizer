import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { summaryRequestSchema, questionRequestSchema } from "@shared/schema";
// @ts-ignore - Ignore the type error for article-parser
import { extract } from "article-parser";
import { generateSummary, answerQuestion } from "./lib/openai";
import { extractArticle } from "./lib/articleExtractor";

/**
 * Helper function to extract and clean article content from a URL
 */
async function extractArticleContent(url: string): Promise<{
  title: string;
  cleanContent: string;
  truncatedContent: string;
}> {
  // Validate URL format
  try {
    const urlObj = new URL(url);
    // Normalize the URL to ensure consistent format
    url = urlObj.toString();
  } catch (error) {
    throw new Error("Invalid URL format");
  }

  // First, try with article-parser
  try {
    console.log(`Extracting content from URL using article-parser: ${url}`);
    const article = await extract(url);

    if (article && article.content) {
      console.log("Article extraction successful with article-parser");

      // Clean the content
      const cleanContent = cleanArticleContent(article.content);

      // Truncate content to a reasonable length
      const MAX_LENGTH = 6000;
      let truncatedContent = cleanContent;
      if (cleanContent.length > MAX_LENGTH) {
        truncatedContent = truncateContent(cleanContent, MAX_LENGTH);
      }

      const articleTitle = article.title || "Unknown Title";

      return {
        title: articleTitle,
        cleanContent,
        truncatedContent,
      };
    }

    // If we get here, article-parser didn't extract content properly
    console.log(
      "Article-parser couldn't extract content properly, trying fallback extractor"
    );
  } catch (error) {
    console.error("Error with article-parser extraction:", error);
    console.log("Falling back to custom article extractor");
  }

  // Fallback to our custom extractor
  try {
    console.log(`Extracting content from URL using fallback extractor: ${url}`);
    const article = await extractArticle(url);

    console.log("Article extraction successful with fallback extractor");

    // Content is already cleaned by the extractor
    const cleanContent = article.content;

    // Truncate content to a reasonable length
    const MAX_LENGTH = 6000;
    let truncatedContent = cleanContent;
    if (cleanContent.length > MAX_LENGTH) {
      truncatedContent = truncateContent(cleanContent, MAX_LENGTH);
    }

    return {
      title: article.title,
      cleanContent,
      truncatedContent,
    };
  } catch (error) {
    console.error("Both extractors failed:", error);
    throw new Error(
      "Could not extract article content from the URL. Please make sure the URL points to a valid article."
    );
  }
}

/**
 * Helper function to clean HTML content
 */
function cleanArticleContent(content: string): string {
  return content
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
}

/**
 * Helper function to truncate content at paragraph or word boundaries
 */
function truncateContent(content: string, maxLength: number): string {
  let truncated = content.substr(0, maxLength);
  const lastParaBreak = truncated.lastIndexOf("\n\n");

  if (lastParaBreak > maxLength * 0.8) {
    // Only cut at paragraph if it's not too short
    truncated = truncated.substr(0, lastParaBreak);
  } else {
    // Otherwise cut at the last word
    truncated = truncated.substr(
      0,
      Math.min(truncated.length, truncated.lastIndexOf(" "))
    );
  }

  return truncated + "...";
}

export function registerRoutes(app: Express): Server {
  // Add a simple test route
  app.get("/api/test", (_req, res) => {
    res.json({ status: "ok", message: "Server is working correctly" });
  });

  app.post("/api/summarize", async (req, res) => {
    try {
      // Log when we receive a summarize request for debugging
      console.log(`Received summarize request from ${req.ip}`);

      // Validate the request data
      const validatedData = summaryRequestSchema.parse(req.body);

      if (!validatedData.url) {
        throw new Error("URL is required");
      }

      // Extract and process article content
      const { title, cleanContent, truncatedContent } =
        await extractArticleContent(validatedData.url);

      // Prepare content with article metadata
      const contentWithMetadata = `Title: ${title}\n\n${truncatedContent}`;

      // Generate AI summary
      console.log("Generating AI summary...");
      const aiSummary = await generateSummary(
        contentWithMetadata,
        validatedData.instructions
      );
      console.log("AI summary generated successfully");

      const result = await storage.createSummary({
        content: cleanContent,
        url: validatedData.url,
        instructions: validatedData.instructions || null,
        summary: aiSummary,
      });

      console.log("Summary created and saved to database");
      res.json(result);
    } catch (error: unknown) {
      console.error("Error in /api/summarize route:", error);
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

      // Extract and process article content
      const { title, cleanContent, truncatedContent } =
        await extractArticleContent(validatedData.url);

      // Prepare content with article metadata
      const contentWithMetadata = `Title: ${title}\n\n${truncatedContent}`;

      // Generate AI answer to the question
      console.log("Generating AI answer to question:", validatedData.question);
      const aiAnswer = await answerQuestion(
        contentWithMetadata,
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
