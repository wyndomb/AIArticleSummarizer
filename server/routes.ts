import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { summaryRequestSchema } from "@shared/schema";
import { generateSummary } from "../client/src/lib/openai";

export function registerRoutes(app: Express): Server {
  app.post("/api/summarize", async (req, res) => {
    try {
      const validatedData = summaryRequestSchema.parse(req.body);
      const summary = await generateSummary(validatedData.content, validatedData.instructions);

      const result = await storage.createSummary({
        content: validatedData.content,
        url: validatedData.url,
        instructions: validatedData.instructions,
        summary,
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