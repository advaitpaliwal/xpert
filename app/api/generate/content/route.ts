import { NextRequest, NextResponse } from "next/server";
import { xai } from "@ai-sdk/xai";
import { generateObject } from "ai";
import { ContentTopicsSchema, generateId, type ContentTopics } from "@/lib/schemas";
import { tryFixAndParseJsonFromError } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const { topicTitle, topicDescription } = await request.json();

    if (!topicTitle || !topicDescription) {
      return NextResponse.json(
        { error: "Topic title and description are required" },
        { status: 400 }
      );
    }

    const result = await generateObject({
      model: xai("grok-4-1-fast-non-reasoning"),
      schema: ContentTopicsSchema,
      system:
        "You are an expert content curator. Generate relevant topic suggestions for different content types based on the given topic. It should be something simple that could be taught in a university course.",
      prompt: `Generate content topics for "${topicTitle}": ${topicDescription}. Create 1 reading topic, 1 audio/podcast topic, and 1 video topic. These are topic suggestions for content that will be generated later.`,
    }).catch((error) => {
      const fixed = tryFixAndParseJsonFromError<ContentTopics>(error);
      if (fixed) {
        console.log("Attempting to fix malformed JSON...");
        const validated = ContentTopicsSchema.safeParse(fixed);
        if (validated.success) {
          console.log("Successfully fixed malformed JSON");
          return { object: validated.data };
        }
      }
      throw error;
    });

    const contentTopics: ContentTopics = {
      reading: {
        ...result.object.reading,
        id: generateId(result.object.reading.title),
      },
      audio: {
        ...result.object.audio,
        id: generateId(result.object.audio.title),
      },
      video: {
        ...result.object.video,
        id: generateId(result.object.video.title),
      },
    };

    return NextResponse.json({ contentTopics });
  } catch (error) {
    console.error("Error generating content topics:", error);
    return NextResponse.json(
      { error: "Failed to generate content topics" },
      { status: 500 }
    );
  }
}
