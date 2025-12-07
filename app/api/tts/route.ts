import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const MAX_INPUT_LENGTH = 4096;
const MAX_PROMPT_LENGTH = 4096;

async function parseParams(request: NextRequest) {
  if (request.method === "GET") {
    const search = request.nextUrl.searchParams;
    return {
      text: search.get("text") || "",
      voice: search.get("voice") || "Aza",
      format: search.get("format") || "mp3",
      instructions: search.get("instructions") || "",
    };
  }

  const body = await request.json();
  return {
    text: body?.text ?? "",
    voice: body?.voice || "Aza",
    format: body?.format || "mp3",
    instructions: body?.instructions || "",
  };
}

async function handleTTS(request: NextRequest) {
  try {
    const { text, voice, format, instructions } = await parseParams(request);

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const xaiApiKey = process.env.XAI_API_KEY;
    if (!xaiApiKey) {
      return NextResponse.json(
        { error: "XAI API key not configured" },
        { status: 500 }
      );
    }

    const safeText = text.slice(0, MAX_INPUT_LENGTH);
    const safeInstructions = (instructions || "").slice(0, MAX_PROMPT_LENGTH);

    const apiUrl = "https://us-east-4.api.x.ai/voice-staging/api/v1/text-to-speech/generate";

    // The upstream API expects either a base64 voice clone or the literal string "None".
    const voiceForApi = voice?.trim() || "None";
    const instructionsForApi = safeInstructions || undefined;

    const payload = {
      model: "grok-voice",
      input: safeText,
      response_format: format,
      instructions: instructionsForApi,
      voice: voiceForApi,
      sampling_params: {
        max_new_tokens: 512,
        temperature: 1.0,
        min_p: 0.01,
        repetition_penalty: 1.0,
      },
    };

    console.log("🎤 TTS request:", {
      textPreview: `${safeText.slice(0, 50)}${safeText.length > 50 ? "..." : ""}`,
      voice: voiceForApi,
      instructions: instructionsForApi ? "[provided]" : "none",
      format,
      hasInstructions: !!safeInstructions,
    });

    const upstream = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${xaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const errorText = await upstream.text();
      console.error(`❌ TTS upstream failed: ${upstream.status} ${upstream.statusText} - ${errorText}`);
      return NextResponse.json(
        { error: `TTS API failed: ${upstream.statusText}`, details: errorText },
        { status: upstream.status }
      );
    }

    const contentTypeHeader = upstream.headers.get("content-type") || "";
    if (!contentTypeHeader.startsWith("audio/")) {
      const errorText = await upstream.text();
      console.error("❌ TTS upstream returned non-audio response:", contentTypeHeader, errorText);
      return NextResponse.json(
        { error: "TTS API returned non-audio response", details: errorText },
        { status: 502 }
      );
    }

    const audioBuffer = Buffer.from(await upstream.arrayBuffer());
    const contentType = format === "mp3" ? "audio/mpeg" : `audio/${format}`;

    console.log("✅ TTS audio bytes:", audioBuffer.byteLength);

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": audioBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    console.error("Error generating speech:", error);
    return NextResponse.json(
      { error: "Failed to generate speech" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return handleTTS(request);
}

export async function GET(request: NextRequest) {
  return handleTTS(request);
}
