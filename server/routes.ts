import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { summaryRequestSchema } from "@shared/schema";
import { extract } from "article-parser";

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
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\s+/g, ' ')    // Replace multiple spaces with single space
        .trim();                 // Remove leading/trailing spaces

      const result = await storage.createSummary({
        content: cleanContent,
        url: validatedData.url,
        instructions: validatedData.instructions,
        summary: cleanContent.slice(0, 100) + "...", // Temporary summary until OpenAI integration
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