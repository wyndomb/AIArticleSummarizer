import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateSummary(content: string, instructions?: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured. Please check your environment variables.");
  }

  const prompt = `Please summarize the following text${instructions ? ` according to these instructions: ${instructions}` : ''}:\n\n${content}\n\nFormat your response as a JSON object with a 'summary' field. The summary should:\n- Start with a concise overview paragraph\n- Use well-structured paragraphs for the main content\n- Include bullet points for key takeaways\n- Use proper spacing between paragraphs\n\nEnsure the response is valid JSON with a 'summary' field containing the formatted text with proper newlines (\\n\\n) between paragraphs and proper bullet point formatting.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a professional article summarizer. Follow these formatting rules strictly:
1. Start with a strong overview paragraph
2. Add two newlines (\\n\\n) between paragraphs for proper spacing
3. Format body paragraphs with clear topic sentences
4. Use proper bullet points with a newline before and after the list
5. Format bullet points with a dash and space (- ) at the start
6. End with clear key takeaways in bullet point format

Always respond with JSON containing a 'summary' field. Preserve all formatting in the summary field.`
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