import { NextRequest, NextResponse } from "next/server";
import { xai } from "@ai-sdk/xai";
import { generateObject } from "ai";
import { ContentTopicsSchema, generateId, type ContentTopics } from "@/lib/schemas";

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
      prompt: `Generate content topics for "${topicTitle}": ${topicDescription}. Create 2 reading topics, 2 audio/podcast topics, and 1 video topic. These are topic suggestions for content that will be generated later.`,
    });

    const reading = result.object.reading.map((topic) => ({
      ...topic,
      id: generateId(topic.title),
    }));

    const audio = result.object.audio.map((topic) => ({
      ...topic,
      id: generateId(topic.title),
    }));

    const contentTopics: ContentTopics = {
      reading,
      audio,
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
