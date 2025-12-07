import { xai } from "@ai-sdk/xai";
import { streamText } from "ai";

export async function POST(req: Request) {
  const { username, expertiseTopic, expertiseDescription, readingTitle, readingDescription } = await req.json();

  const result = streamText({
    model: xai("grok-4-1-fast-non-reasoning"),
    system: `You are an expert content creator specializing in educational writing. Create compelling, in-depth reading content that teaches and engages.`,
    prompt: `Create the body content for an educational article about "${readingTitle}" for @${username}.

Context:
- This is part of their expertise in: ${expertiseTopic} - ${expertiseDescription}
- Article topic: ${readingTitle}
- Topic description: ${readingDescription}

The title and description are already displayed, so start directly with the article content.

Create comprehensive body content (800-1200 words) that:
1. Opens with a captivating introduction that expands on the topic
2. Breaks down complex concepts into digestible sections with clear headings
3. Includes practical examples or real-world applications
4. Provides actionable insights and advice
5. Ends with key takeaways or a conclusion

Advanced formatting options (use when helpful):
- **Mermaid diagrams**: Use mermaid code blocks for flowcharts, diagrams, or visualizations
- **Tables**: Use markdown tables to organize comparative data or information
- **Math notation**: Use LaTeX syntax ($inline$ or $$block$$) for mathematical expressions
- **Code blocks**: Use fenced code blocks with language tags for code examples
- **Task lists**: Use - [ ] and - [x] for actionable checklists

Write in a clear, engaging style that balances depth with readability. Format using markdown with proper headings (## for main sections, ### for subsections), **bold** text for emphasis, and bullet points where appropriate. Do NOT include a main title (# heading) as that's already displayed.`,
  });

  return result.toTextStreamResponse();
}
