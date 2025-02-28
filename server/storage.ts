import {
  type Summary,
  type InsertSummary,
  type Question,
  type InsertQuestion,
} from "@shared/schema";

export interface IStorage {
  createSummary(summary: InsertSummary): Promise<Summary>;
  getSummary(id: number): Promise<Summary | undefined>;
  getSummaries(): Promise<Summary[]>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  getQuestion(id: number): Promise<Question | undefined>;
  getQuestions(): Promise<Question[]>;
}

export class MemStorage implements IStorage {
  private summaries: Map<number, Summary>;
  private questions: Map<number, Question>;
  private summaryId: number;
  private questionId: number;

  constructor() {
    this.summaries = new Map();
    this.questions = new Map();
    this.summaryId = 1;
    this.questionId = 1;
  }

  async createSummary(insertSummary: InsertSummary): Promise<Summary> {
    const id = this.summaryId++;
    const summary: Summary = {
      ...insertSummary,
      id,
      createdAt: new Date(),
      content: insertSummary.content || null,
      instructions: insertSummary.instructions || null,
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

  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const id = this.questionId++;
    const question: Question = {
      ...insertQuestion,
      id,
      createdAt: new Date(),
      content: insertQuestion.content || null,
    };
    this.questions.set(id, question);
    return question;
  }

  async getQuestion(id: number): Promise<Question | undefined> {
    return this.questions.get(id);
  }

  async getQuestions(): Promise<Question[]> {
    return Array.from(this.questions.values());
  }
}

export const storage = new MemStorage();
