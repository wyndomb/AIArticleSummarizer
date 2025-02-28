import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const summaries = pgTable("summaries", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  content: text("content"),
  summary: text("summary").notNull(),
  instructions: text("instructions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Add a new table for questions and answers
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  content: text("content"),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSummarySchema = createInsertSchema(summaries).omit({
  id: true,
  createdAt: true,
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
  createdAt: true,
});

export type InsertSummary = z.infer<typeof insertSummarySchema>;
export type Summary = typeof summaries.$inferSelect;

export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;

// Schema for summary request
export const summaryRequestSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  content: z.string().optional(),
  instructions: z.string().optional(),
});

// Schema for question request
export const questionRequestSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  content: z.string().optional(),
  question: z.string().min(1, "Please enter your question"),
});

export type SummaryRequest = z.infer<typeof summaryRequestSchema>;
export type QuestionRequest = z.infer<typeof questionRequestSchema>;
