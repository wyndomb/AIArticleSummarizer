import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const summaries = pgTable("summaries", {
  id: serial("id").primaryKey(),
  url: text("url"),
  content: text("content").notNull(),
  summary: text("summary").notNull(),
  instructions: text("instructions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSummarySchema = createInsertSchema(summaries).omit({
  id: true,
  createdAt: true,
});

export type InsertSummary = z.infer<typeof insertSummarySchema>;
export type Summary = typeof summaries.$inferSelect;

// Schema for summary request
export const summaryRequestSchema = z.object({
  content: z.string().min(1, "Content is required"),
  url: z.string().url().optional(),
  instructions: z.string().optional(),
});

export type SummaryRequest = z.infer<typeof summaryRequestSchema>;
