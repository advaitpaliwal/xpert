import { NextRequest, NextResponse } from "next/server";
import { xai } from "@ai-sdk/xai";
import { experimental_generateImage as generateImage } from "ai";

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const result = await generateImage({
      model: xai.image("grok-2-image"),
      prompt,
    });

    const imageUrl = `data:${result.image.mediaType};base64,${result.image.base64}`;

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("Error generating image:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
