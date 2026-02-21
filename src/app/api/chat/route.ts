import { streamText, convertToModelMessages } from "ai";
import { openai } from "@ai-sdk/openai";

export const maxDuration = 60;

export async function POST(request: Request) {
  const { messages, owner, repo, activeFeatureId, wikiContext } =
    await request.json();

  if (!owner || !repo) {
    return new Response("Missing owner or repo", { status: 400 });
  }

  if (!wikiContext || typeof wikiContext !== "string") {
    return new Response("Missing wiki context", { status: 400 });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("Invalid messages", { status: 400 });
  }

  if (messages.length > 50) {
    return new Response("Too many messages", { status: 400 });
  }

  const systemPrompt = `You are a helpful assistant that answers questions about the ${repo} repository based on its generated wiki documentation.

## Wiki Documentation

${wikiContext}

## Instructions

- Answer questions based ONLY on the wiki documentation above. If the answer is not in the wiki, say so.
- Be concise and direct. Use markdown formatting in your responses.
- When referencing code or files, use the citation URLs from the wiki when available.
- The user is currently viewing the "${activeFeatureId ?? "overview"}" feature page.
- If the user asks about something not covered in the wiki, suggest which parts of the wiki might be most relevant.`;

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: openai("gpt-5-mini"),
    system: systemPrompt,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
