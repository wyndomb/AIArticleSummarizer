import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateSummary(content: string, instructions?: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured. Please check your environment variables.");
  }

  const prompt = `Please summarize the following text${instructions ? ` according to these instructions: ${instructions}` : ''}:\n\n${content}\n\nFormat your response as a JSON object with a 'summary' field. The summary should:\n- Start with a concise overview paragraph\n- Use well-structured paragraphs for the main content\n- Include bullet points for key takeaways\n- Use proper spacing between paragraphs\n\nEnsure the response is valid JSON with a 'summary' field containing the formatted text.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional article summarizer. Create clear, well-structured summaries with proper formatting. Use paragraphs for narrative flow and bullet points for key takeaways. Always respond with JSON containing a 'summary' field. Make sure paragraphs are separated by double newlines and bullet points are properly formatted."
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