import { NextRequest, NextResponse } from "next/server";
import { xai } from "@ai-sdk/xai";
import { generateObject } from "ai";
import { PodcastScriptSchema, PodcastTurnSchema, type PodcastScript } from "@/lib/schemas";
import { tryFixAndParseJsonFromError } from "@/lib/utils";
import { z } from "zod";
import axios from "axios";
import { Readable } from "node:stream";

export const maxDuration = 300;
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

    if (!audioTitle || !audioDescription) {
      return NextResponse.json(
        { error: "Audio title and description are required" },
        { status: 400 }
      );
    }

    const xaiApiKey = process.env.XAI_API_KEY;
    if (!xaiApiKey) {
      return NextResponse.json(
        { error: "XAI API key not configured" },
        { status: 500 }
      );
    }

    console.log("Generating podcast script...");

    // Step 1: Generate the conversation script using Grok
    let scriptTurns: Array<{ speaker: "host" | "guest"; text: string }>;
    try {
      const scriptResult = await generateObject({
        model: xai("grok-4-1-fast-non-reasoning"),
        schema: RelaxedPodcastScriptSchema,
        system: "You are an expert podcast script writer. Create engaging, natural conversations between a knowledgeable host and an expert guest. Keep the whole conversation concise (aim for ~2 minutes of audio) with 2-3 sentences per turn. The dialogue should flow naturally with back-and-forth exchanges, questions, insights, and moments of humor or curiosity.",
        prompt: `Create a podcast conversation script about "${audioTitle}" for @${username}'s audience.

Context:
- This is part of their expertise in: ${expertiseTopic} - ${expertiseDescription}
- Podcast topic: ${audioTitle}
- Topic description: ${audioDescription}

Create a natural conversation between:
- Host: An enthusiastic, curious interviewer who asks insightful questions
- Guest: An expert (representing @${username}) who shares deep knowledge in an accessible way

The conversation should:
1. Start with a warm introduction and hook
2. Have the host ask interesting questions that guide the discussion
3. Include the guest sharing insights, examples, and practical takeaways
4. Flow naturally with back-and-forth exchanges (8-16 turns total)
5. End with a memorable conclusion or call-to-action

Make it conversational, educational, and engaging - like a real podcast discussion between two people who enjoy talking about this topic.`,
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

    console.log(`✓ Script generated with ${parsedScript.data.turns.length} turns`);

    // Step 2: Convert script to podcast API format
    const speakers = [
      {
        id: "host",
        voice: "Aza",
        audio: null,
        instructions: "Warm, friendly, and conversational."
      },
      {
        id: "guest",
        voice: "Rex",
        audio: null,
        instructions: "Confident, calm, and professional."
      }
    ];

    const script = parsedScript.data.turns.map(turn => ({
      speaker_id: turn.speaker,
      text: turn.text
    }));

    const podcastPayload = {
      model: "grok-voice",
      speakers: speakers,
      script: script,
      response_format: "mp3",
      num_tts_blocks_history: 4,
      sampling_params: {
        max_new_tokens: 4096,
        temperature: 1.0,
        min_p: 0.01,
        seed: 191119,
        repetition_penalty: 1.0
      }
    };

    console.log("Generating podcast audio...");

    // Step 3: Generate the podcast audio (streaming)
    const podcastResponse = await axios.post(
      "https://us-east-4.api.x.ai/voice-staging/api/v1/text-to-speech/generate-podcast",
      podcastPayload,
      {
        headers: {
          Authorization: `Bearer ${xaiApiKey}`,
          "Content-Type": "application/json",
        },
        responseType: "stream",
        timeout: 120000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    if (podcastResponse.status >= 400) {
      const errorChunks: Uint8Array[] = [];
      for await (const chunk of podcastResponse.data as Readable) {
        errorChunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      }
      const errorText = Buffer.concat(errorChunks).toString("utf8");
      console.error(`❌ Podcast API Error: ${podcastResponse.status} ${podcastResponse.statusText}`);
      console.error(`   Response: ${errorText}`);
      return NextResponse.json(
        { error: `Podcast generation failed: ${podcastResponse.statusText}`, details: errorText },
        { status: podcastResponse.status }
      );
    }

    // Stream audio back to the client without buffering the whole file.
    console.log(`✅ Podcast generation streaming back to client`);
    const nodeStream = podcastResponse.data as Readable;
    const webStream = Readable.toWeb(nodeStream);
    return new NextResponse(webStream as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "audio/mp3",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });

  } catch (error) {
    console.error("Error generating podcast:", error);
    return NextResponse.json(
      { error: "Failed to generate podcast" },
      { status: 500 }
    );
  }
}

// Support GET so clients can stream directly via audio src.
export async function GET(request: NextRequest) {
  return POST(request);
}
