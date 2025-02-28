import dotenv from "dotenv";
dotenv.config();

import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateSummary(
  content: string,
  instructions?: string
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OpenAI API key is not configured. Please check your environment variables."
    );
  }

  const prompt = `Please analyze the following article${
    instructions ? ` with these additional instructions: ${instructions}` : ""
  }:\n\n${content}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a highly skilled article analyst. Please analyze the provided article using the following structured approach:

When analyzing an article, follow these key principles:
- Focus on extracting the most significant and valuable information
- Maintain objectivity while identifying key insights
- Ensure all summaries and insights are supported by the article content
- Use clear, concise language in your analysis

Required Analysis Categories:

## CORE INFORMATION
Identify and list:
- Title of the article (if available)
- Primary topic or main subject matter
- Field/industry the article addresses

## EXECUTIVE SUMMARY
Write 2-3 paragraphs that:
- Capture the main argument or central thesis
- Outline the most significant findings or points
- Explain why this topic matters
- Describe the article's core contribution to the field

## KEY INSIGHTS (3-4 insights)
For each key insight:
- State the insight clearly in one sentence
- Explain its significance and implications
- Support it with specific evidence from the article
- Number each insight for easy reference

## THOUGHT-PROVOKING ELEMENTS
Identify and explain:
- Novel or unexpected perspectives
- Challenges to conventional thinking
- Innovative approaches or solutions
- Potential paradigm shifts discussed
- Future implications suggested

## CRITICAL DISCUSSION POINTS
Focus on:
- Main areas of debate or controversy
- Potential limitations or challenges
- Future implications or developments
- Unanswered questions raised
- Areas requiring further exploration

## KEY QUOTES
Select 2-3 significant quotes that:
- Capture central arguments
- Present unique insights
- Support major points
- Include proper attribution if available
- Explain why each quote is significant

Output Format Guidelines:
- Use markdown headers (##) for main sections
- Start each section on a new line
- Use bullet points for lists within sections
- Bold (**) important terms or concepts
- Include line breaks between sections for readability

Special Instructions:
- If any section cannot be completed due to missing information, note this briefly
- Maintain the original article's technical level in your summary
- Keep the analysis focused and avoid tangential information
- Ensure each section directly relates to the article's content`,
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "text" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No summary generated");
    }

    return content;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error("Failed to generate summary: " + errorMessage);
  }
}

export async function answerQuestion(
  content: string,
  question: string
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OpenAI API key is not configured. Please check your environment variables."
    );
  }

  const prompt = `I have the following article content:

${content}

Please answer this specific question about the article:
${question}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a friendly and helpful assistant who specializes in explaining articles to users. 
          
When answering questions about an article:
- Provide direct, clear answers based solely on the article content
- Use a conversational, friendly tone as if chatting with a friend
- Include relevant context from the article to support your answers
- If the article doesn't contain information to answer the question, clearly state this
- Format your response with markdown for readability when appropriate
- Use examples or analogies from the article when they help clarify complex concepts
- Keep your answers focused and concise while being thorough

Your goal is to help the user understand the article better by answering their specific questions in a helpful, accurate, and friendly manner.`,
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "text" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No answer generated");
    }

    return content;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error("Failed to generate answer: " + errorMessage);
  }
}
