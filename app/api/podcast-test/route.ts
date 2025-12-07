import { NextResponse } from "next/server";
import axios from "axios";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Simple fixed-script test route to verify end-to-end podcast streaming.
export async function GET() {
  const xaiApiKey = process.env.XAI_API_KEY;
  if (!xaiApiKey) {
    return NextResponse.json(
      { error: "XAI API key not configured" },
      { status: 500 }
    );
  }

  const speakers = [
    {
      id: "Aza",
      voice: "Aza",
      instructions: "Warm, friendly interviewer.",
      audio: null,
    },
    {
      id: "Rex",
      voice: "Rex",
      instructions: "Confident, professional guest.",
      audio: null,
    },
  ];

  const script = [
    { speaker_id: "Aza", text: "Welcome to our quick test of the podcast streaming pipeline." },
    { speaker_id: "Rex", text: "Hi Aza. If you can hear me, streaming from xAI through our API is working." },
    { speaker_id: "Aza", text: "Great! Let's wrap this test and confirm the audio finishes cleanly." },
  ];

  const payload = {
    model: "grok-voice",
    speakers,
    script,
    response_format: "mp3",
    num_tts_blocks_history: 5,
    sampling_params: {
      max_new_tokens: 2048,
      temperature: 1.0,
      min_p: 0.01,
      repetition_penalty: 1.0,
    },
  };

  try {
    const doRequest = async () => {
      return axios.post<ArrayBuffer>(
        "https://us-east-4.api.x.ai/voice-staging/api/v1/text-to-speech/generate-podcast",
        payload,
        {
          headers: {
            Authorization: `Bearer ${xaiApiKey}`,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          responseType: "arraybuffer",
          timeout: 120000,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          decompress: true,
        }
      );
    };

    let response;
    try {
      response = await doRequest();
    } catch {
      // Single retry for flaky upstream disconnects.
      response = await doRequest();
    }

    if (!response || response.status >= 400) {
      const status = response?.status ?? 500;
      const statusText = response?.statusText ?? "Unknown error";
      return NextResponse.json(
        { error: `Podcast generation failed: ${statusText}` },
        { status }
      );
    }

    const audioBuffer = Buffer.from(response.data);

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mp3",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error: unknown) {
    console.error("Error generating test podcast:", error);
    return NextResponse.json(
      { error: "Failed to generate test podcast" },
      { status: 500 }
    );
  }
}
