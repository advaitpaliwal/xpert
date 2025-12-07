import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { Readable } from "node:stream";
import { z } from "zod";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const PodcastAudioRequestSchema = z.object({
  turns: z.array(
    z.object({
      speaker: z.enum(["host", "guest"]),
      text: z.string(),
    })
  ).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("📥 Received audio generation request with", body.turns?.length, "turns");

    const validatedBody = PodcastAudioRequestSchema.safeParse(body);

    if (!validatedBody.success) {
      console.error("❌ Validation failed:", validatedBody.error);
      return NextResponse.json(
        { error: "Invalid request body", details: validatedBody.error },
        { status: 400 }
      );
    }

    const { turns } = validatedBody.data;

    const xaiApiKey = process.env.XAI_API_KEY;
    if (!xaiApiKey) {
      console.error("❌ XAI API key not configured");
      return NextResponse.json(
        { error: "XAI API key not configured" },
        { status: 500 }
      );
    }

    // Convert script to podcast API format
    // IMPORTANT: speaker_id in script must match the 'id' field of speakers, not the 'voice' field!
    const speakers = [
      {
        id: "host",
        voice: "Aza",
        audio: null,
        instructions: "Warm, enthusiastic co-host having a friendly discussion. Natural and conversational."
      },
      {
        id: "guest",
        voice: "Leo",
        audio: null,
        instructions: "Thoughtful, engaged co-host having a friendly discussion. Natural and conversational."
      }
    ];

    const script = turns.map(turn => ({
      speaker_id: turn.speaker,
      text: turn.text
    }));

    console.log("🎭 Speakers configured:", speakers.map(s => `${s.id} (voice: ${s.voice})`).join(", "));
    console.log("📝 Script turns:", script.map(s => s.speaker_id).join(", "));

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

    console.log("🎤 Sending request to XAI voice API...");
    console.log("📦 Payload:", JSON.stringify(podcastPayload, null, 2));

    // Generate the podcast audio (streaming)
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

    console.log(`📡 XAI API response status: ${podcastResponse.status}`);

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

    // Add error handling to the stream
    nodeStream.on('error', (error) => {
      console.error('❌ Stream error:', error);
    });

    nodeStream.on('end', () => {
      console.log('✅ Stream completed successfully');
    });

    const webStream = Readable.toWeb(nodeStream);

    return new NextResponse(webStream as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
      },
    });

  } catch (error) {
    console.error("❌ Error generating podcast audio:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message, error.stack);
    }
    return NextResponse.json(
      { error: "Failed to generate podcast audio", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
