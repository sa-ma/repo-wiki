import { streamText, convertToModelMessages } from "ai";
import { openai } from "@ai-sdk/openai";
import { getCachedWiki } from "@/lib/pipeline";
import { serializeWikiToMarkdown } from "@/lib/pipeline/serialize";

export const maxDuration = 60;

export async function POST(request: Request) {
  const { messages, owner, repo, activeFeatureId } = await request.json();

  if (!owner || !repo) {
    return new Response("Missing owner or repo", { status: 400 });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("Invalid messages", { status: 400 });
  }

  if (messages.length > 50) {
    return new Response("Too many messages", { status: 400 });
  }

  const wiki = getCachedWiki(owner, repo);
  if (!wiki) {
    return new Response("Wiki not found. Please regenerate the wiki.", {
      status: 404,
    });
  }

  const wikiMarkdown = serializeWikiToMarkdown(wiki);
  const activeFeature = wiki.features.find((f) => f.id === activeFeatureId);

  const systemPrompt = `You are a helpful assistant that answers questions about the ${wiki.repoName} repository based on its generated wiki documentation.

## Wiki Documentation

${wikiMarkdown}

## Instructions

- Answer questions based ONLY on the wiki documentation above. If the answer is not in the wiki, say so.
- Be concise and direct. Use markdown formatting in your responses.
- When referencing code or files, use the citation URLs from the wiki when available.
- The user is currently viewing the "${activeFeature?.name ?? "overview"}" feature page.
- If the user asks about something not covered in the wiki, suggest which parts of the wiki might be most relevant.`;

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: openai("gpt-5-mini"),
    system: systemPrompt,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
