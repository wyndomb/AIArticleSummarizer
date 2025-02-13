import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateSummary(content: string, instructions?: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured. Please check your environment variables.");
  }

  const prompt = `Please summarize the following text${instructions ? ` according to these instructions: ${instructions}` : ''}:\n\n${content}\n\nProvide your response in JSON format with a 'summary' field containing the summarized text.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional article summarizer. Create clear, concise summaries while maintaining the key points and context. Always respond with JSON containing a 'summary' field."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No summary generated");
    }

    const result = JSON.parse(content);
    return result.summary;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error("Failed to generate summary: " + errorMessage);
  }
}