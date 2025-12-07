import { NextRequest, NextResponse } from "next/server";
import { xai } from "@ai-sdk/xai";
import { generateObject } from "ai";
import { PodcastScriptSchema, PodcastTurnSchema, type PodcastScript } from "@/lib/schemas";
import { tryFixAndParseJsonFromError } from "@/lib/utils";
import { z } from "zod";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const RelaxedPodcastScriptSchema = z.object({
  turns: z.array(PodcastTurnSchema).min(8).max(32),
});

async function getParams(request: NextRequest) {
  if (request.method === "GET") {
    const search = request.nextUrl.searchParams;
    return {
      username: search.get("username") || "",
      expertiseTopic: search.get("expertiseTopic") || "",
      expertiseDescription: search.get("expertiseDescription") || "",
      audioTitle: search.get("audioTitle") || "",
      audioDescription: search.get("audioDescription") || "",
    };
  }
  return request.json();
}

export async function POST(request: NextRequest) {
  try {
    const { username, expertiseTopic, expertiseDescription, audioTitle, audioDescription } = await getParams(request);

    console.log("📝 Script generation request:", { username, expertiseTopic, audioTitle });

    if (!audioTitle || !audioDescription) {
      console.error("❌ Missing required fields");
      return NextResponse.json(
        { error: "Audio title and description are required" },
        { status: 400 }
      );
    }

    console.log("🤖 Generating podcast script with Grok...");

    // Generate the conversation script using Grok
    let scriptTurns: Array<{ speaker: "host" | "guest"; text: string }>;
    try {
      const scriptResult = await generateObject({
        model: xai("grok-4-1-fast-non-reasoning"),
        schema: RelaxedPodcastScriptSchema,
        system: "You are an expert podcast script writer. Create engaging, natural conversations between two co-hosts discussing a topic together. Keep the whole conversation concise (aim for ~2 minutes of audio) with 2-3 sentences per turn. The dialogue should flow naturally with back-and-forth exchanges, insights, debates, and moments of humor or curiosity.",
        prompt: `Create a podcast conversation script about "${audioTitle}".

Context:
- Expertise area: ${expertiseTopic} - ${expertiseDescription}
- Podcast topic: ${audioTitle}
- Topic description: ${audioDescription}

Create a natural conversation between TWO CO-HOSTS (not an interview):
- Host: First co-host who brings energy and interesting perspectives
- Guest: Second co-host who adds complementary insights and angles

The conversation should:
1. Start with both hosts introducing the topic together with a warm, conversational hook
2. Have both hosts discussing, building on each other's points, and exploring different angles
3. Include both hosts sharing insights, examples, and practical takeaways
4. Feel like two friends having an engaging discussion about something they find interesting
5. Flow naturally with back-and-forth exchanges (8-16 turns total)
6. End with a memorable conclusion where both hosts wrap up the discussion

IMPORTANT: This is NOT an interview. Both speakers are co-hosts having a balanced conversation. They should bounce ideas off each other, agree, disagree, and explore the topic together as equals.

Make it conversational, educational, and engaging - like two knowledgeable friends discussing something fascinating.`,
      }).catch((error) => {
        const fixed = tryFixAndParseJsonFromError<PodcastScript>(error);
        if (fixed?.turns) {
          console.warn("Attempting to fix malformed JSON for podcast script...");
          const validated = RelaxedPodcastScriptSchema.safeParse(fixed);
          if (validated.success) {
            console.log("Successfully fixed malformed JSON");
            return { object: validated.data };
          }
        }
        throw error;
      });
      scriptTurns = scriptResult.object.turns;
    } catch (error: unknown) {
      // Sometimes the model returns >16 turns causing schema validation to fail.
      const turnsFromError = (() => {
        if (typeof error !== "object" || error === null) return undefined;
        const value = (error as { value?: unknown }).value;
        if (typeof value !== "object" || value === null) return undefined;
        if (!("turns" in value)) return undefined;
        return (value as { turns?: unknown }).turns;
      })();
      if (Array.isArray(turnsFromError)) {
        console.warn(`Schema validation failed with ${turnsFromError.length} turns, trimming to 16 and continuing.`);
        scriptTurns = turnsFromError.slice(0, 16);
      } else {
        throw error;
      }
    }

    // Enforce strict schema after trimming to avoid sending bad data downstream.
    const SAFE_TURN_LIMIT = 10; // shorter scripts reduce TTS timeouts
    const trimmedTurns = scriptTurns.slice(0, SAFE_TURN_LIMIT).map((turn) => ({
      ...turn,
      text: turn.text.slice(0, 500), // prevent overly long turns from bloating TTS
    }));
    const parsedScript = PodcastScriptSchema.safeParse({
      turns: trimmedTurns, // final guard
    });

    if (!parsedScript.success) {
      console.error("Podcast script did not meet schema requirements:", parsedScript.error);
      return NextResponse.json(
        { error: "Podcast script generation failed validation" },
        { status: 500 }
      );
    }

    console.log(`✅ Script generated successfully with ${parsedScript.data.turns.length} turns`);
    console.log("📋 Turn speakers:", parsedScript.data.turns.map(t => t.speaker).join(", "));

    return NextResponse.json({
      turns: parsedScript.data.turns,
    });

  } catch (error) {
    console.error("❌ Error generating podcast script:", error);
    return NextResponse.json(
      { error: "Failed to generate podcast script", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
