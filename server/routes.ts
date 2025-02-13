import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { summaryRequestSchema } from "@shared/schema";
import { extract } from "article-parser";
import { generateSummary } from "./lib/openai";

export function registerRoutes(app: Express): Server {
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
        .replace(/<\/p>/gi, '\n\n')    // Replace closing paragraph tags with double newlines
        .replace(/<br\s*\/?>/gi, '\n')  // Replace <br> tags with single newlines
        .replace(/<[^>]*>/g, '')       // Remove remaining HTML tags
        .replace(/\n\s*\n/g, '\n\n')   // Normalize multiple newlines to double newlines
        .replace(/\s+/g, ' ')          // Replace multiple spaces with single space
        .split('\n\n')                 // Split into paragraphs
        .map(para => para.trim())      // Trim each paragraph
        .filter(para => para.length)   // Remove empty paragraphs
        .join('\n\n')                  // Join paragraphs with double newlines
        .trim();                       // Final trim

      // Get approximately 1000 words (around 6000 characters)
      const MAX_LENGTH = 6000;
      let truncatedContent = cleanContent;
      if (cleanContent.length > MAX_LENGTH) {
        // Find the last complete paragraph within the limit
        truncatedContent = cleanContent.substr(0, MAX_LENGTH);
        const lastParaBreak = truncatedContent.lastIndexOf('\n\n');
        if (lastParaBreak > MAX_LENGTH * 0.8) { // Only cut at paragraph if it's not too short
          truncatedContent = truncatedContent.substr(0, lastParaBreak);
        } else {
          // Otherwise cut at the last word
          truncatedContent = truncatedContent.substr(0, Math.min(
            truncatedContent.length,
            truncatedContent.lastIndexOf(' ')
          ));
        }
        truncatedContent += '...';
      }

      // Generate AI summary
      const aiSummary = await generateSummary(truncatedContent, validatedData.instructions);

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

  app.get("/api/summaries", async (_req, res) => {
    const summaries = await storage.getSummaries();
    res.json(summaries);
  });

  const httpServer = createServer(app);
  return httpServer;
}