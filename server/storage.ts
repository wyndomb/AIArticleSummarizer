import { type Summary, type InsertSummary } from "@shared/schema";

export interface IStorage {
  createSummary(summary: InsertSummary): Promise<Summary>;
  getSummary(id: number): Promise<Summary | undefined>;
  getSummaries(): Promise<Summary[]>;
}

export class MemStorage implements IStorage {
  private summaries: Map<number, Summary>;
  private currentId: number;

  constructor() {
    this.summaries = new Map();
    this.currentId = 1;
  }

  async createSummary(insertSummary: InsertSummary): Promise<Summary> {
    const id = this.currentId++;
    const summary: Summary = {
      ...insertSummary,
      id,
      createdAt: new Date(),
    };
    this.summaries.set(id, summary);
    return summary;
  }

  async getSummary(id: number): Promise<Summary | undefined> {
    return this.summaries.get(id);
  }

  async getSummaries(): Promise<Summary[]> {
    return Array.from(this.summaries.values());
  }
}

export const storage = new MemStorage();
