import { NextRequest, NextResponse } from "next/server";
import { xai } from "@ai-sdk/xai";
import { generateObject } from "ai";
import { SlideshowSchema, generateId, type Slide, type Slideshow } from "@/lib/schemas";
import { tryFixAndParseJsonFromError } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const { expertiseTopic, expertiseDescription, videoTitle, videoDescription } = await request.json();

    if (!videoTitle || !videoDescription) {
      return NextResponse.json(
        { error: "Video title and description are required" },
        { status: 400 }
      );
    }

    console.log("🎬 Generating slideshow...");

    const result = await generateObject({
      model: xai("grok-4-1-fast-non-reasoning"),
      schema: SlideshowSchema,
      system: `You are an expert educational content creator. Create engaging presentation slides.
CRITICAL: Output ONLY valid JSON. Ensure all strings are properly escaped. No special characters that break JSON.`,
      prompt: `Create a 10-slide presentation about "${videoTitle}".

Context:
- Related expertise area: ${expertiseTopic} - ${expertiseDescription}
- Video topic: ${videoTitle}
- Topic description: ${videoDescription}

Create exactly 10 slides that:
1. Start with an engaging introduction slide that hooks the viewer
2. Progress logically through the topic, building on previous concepts
3. Each slide should have:
   - A clear, punchy title
   - 2-5 bullet points with key information (concise, 1-2 sentences each)
   - An audio transcript with natural, conversational narration (20-30 seconds when spoken)
4. Use storytelling techniques to make the content engaging
5. End with a strong conclusion slide that ties everything together
6. Format like a professional presentation (think Google Slides/PowerPoint style)

IMPORTANT: Keep text simple. Avoid special characters that might break JSON (emojis, fancy quotes, etc).

Voice and perspective:
- Present the content in an educational, engaging way directly to the viewer
- Use second-person ("you") when appropriate to engage the audience

Make the content educational but entertaining. The slides should work together as a cohesive presentation that teaches the viewer about this topic in an engaging way.`,
    }).catch((error) => {
      console.warn("⚠️ JSON parsing error, attempting to fix...");
      const fixed = tryFixAndParseJsonFromError<Slideshow>(error);
      if (fixed?.slides) {
        console.log("🔧 Attempting to validate fixed JSON...");
        const validated = SlideshowSchema.safeParse(fixed);
        if (validated.success) {
          console.log("✅ Successfully fixed malformed JSON");
          return { object: validated.data };
        } else {
          console.error("❌ Validation failed even after fix:", validated.error);
        }
      }
      console.error("❌ Could not fix JSON:", error);
      throw error;
    });

    // Add IDs to each slide
    const slidesWithIds = result.object.slides.map((slide) => ({
      ...slide,
      id: generateId(slide.title),
    })) as Slide[];

    console.log(`✅ Slideshow generated with ${slidesWithIds.length} slides`);

    return NextResponse.json({ slideshow: { slides: slidesWithIds } });
  } catch (error) {
    console.error("❌ Error generating slideshow:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
    return NextResponse.json(
      { error: "Failed to generate slideshow", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
