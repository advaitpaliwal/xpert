import { NextRequest, NextResponse } from "next/server";
import { xai } from "@ai-sdk/xai";
import { generateObject } from "ai";
import { MindmapSchema } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  try {
    const { username, expertiseTopic, expertiseDescription } = await request.json();

    if (!expertiseTopic || !expertiseDescription) {
      return NextResponse.json(
        { error: "Expertise topic and description are required" },
        { status: 400 }
      );
    }

    const result = await generateObject({
      model: xai("grok-2-1212"),
      schema: MindmapSchema,
      system: "You are an expert at creating educational mindmaps in markdown format. Create clear, hierarchical structures using markdown headers and lists.",
      prompt: `Create a comprehensive mindmap in markdown format for "${expertiseTopic}" for @${username}.

Context:
- Topic: ${expertiseTopic}
- Description: ${expertiseDescription}

Create a markdown mindmap that:
1. Uses # for the main topic
2. Uses ## for major subtopics (2-5 main branches)
3. Uses ### and #### for sub-concepts
4. Uses bullet points (-) and nested lists for detailed points
5. Includes **bold** for emphasis on key terms
6. Uses *italic* for definitions or explanations
7. Optionally uses code blocks, links, or other markdown features where helpful

The markdown should be well-structured and educational, helping learners understand the topic visually through hierarchy and relationships.

Example structure:
# Main Topic

## First Major Concept
- Key point
  - Detail
  - Another detail
- **Important term**: *definition*

## Second Major Concept
- Point
- Point`,
    });

    return NextResponse.json({ mindmap: result.object });
  } catch (error) {
    console.error("Error generating mindmap:", error);
    return NextResponse.json(
      { error: "Failed to generate mindmap" },
      { status: 500 }
    );
  }
}
