#!/usr/bin/env python3
"""
Demo script for calling the Podcast API endpoints using Stock Grok Voices.
"""

import requests
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import os

load_dotenv('/Users/advaitpaliwal/Projects/xpert/.env.local')

# --- Configuration ---
API_KEY = os.environ.get("XAI_API_KEY")
BASE_URL = "https://us-east-4.api.x.ai/voice-staging"
ENDPOINT = f"{BASE_URL}/api/v1/text-to-speech/generate-podcast"

# --- Data Models (Same as demo_podcast.py) ---

class SamplingParams(BaseModel):
    max_new_tokens: int = Field(..., description="Maximum number of new tokens to generate")
    temperature: float = Field(..., description="Temperature")
    min_p: float = Field(..., description="Minimum probability")
    seed: int | None = Field(None, description="Seed")
    repetition_penalty: float = Field(1.0, description="Repetition penalty")

DEFAULT_SAMPLING_PARAMS = SamplingParams(
    max_new_tokens=4096, temperature=1.0, min_p=0.01, seed=191119, repetition_penalty=1.0
)

class Speaker(BaseModel):
    id: str = Field(..., description="Speaker ID used in the script")
    audio: str | None = Field(None, description="Audio Base64 (None for stock voices)")
    voice: list[int] | str | None = Field(
        None,
        description="Voice ID (e.g. 'Aza', 'Rex')",
    )
    instructions: str = Field(
        "", max_length=16000, description="Instructions (Vibe/Tone)"
    )

class Turn(BaseModel):
    speaker_id: str
    text: str

class GeneratePodcastModel(BaseModel):
    model: str = Field(..., description="Model name")
    speakers: list[Speaker] = Field(..., description="Personalities")
    sampling_params: SamplingParams = Field(
        DEFAULT_SAMPLING_PARAMS, description="Sampling parameters"
    )
    response_format: str = Field(..., description="Response format")
    script: list[Turn] | None = Field(..., description="Script")
    num_tts_blocks_history: int = Field(5, description="Number of TTS blocks history")

# --- Main Logic ---

def podcast_request(model: GeneratePodcastModel, output_file: str = "output.mp3"):
    payload = model.model_dump()

    print(f"Sending request to {ENDPOINT}...")
    # print(payload) # Uncomment to debug payload

    response = requests.post(ENDPOINT, json=payload, stream=True, headers={"Authorization": f"Bearer {API_KEY}"})

    if response.status_code == 200:
        with open(output_file, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"✅ Audio saved to {output_file}")
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")

def main():
    print("=" * 60)
    print("Podcast API Demo - Stock Voices")
    print("=" * 60)

    # 1. Define Speakers
    # We map the ID "Aza" to the Voice "Aza", and ID "Rex" to Voice "Rex".
    # We set audio=None because we are not cloning.
    speakers_list = [
        Speaker(
            id="Aza",
            voice="Aza",
            audio=None,
            instructions="Warm, friendly, and conversational."
        ),
        Speaker(
            id="Rex",
            voice="Rex",
            audio=None,
            instructions="Confident, calm, and professional."
        ),
    ]

    # 2. Define Script
    # The speaker_id must match the 'id' defined above.
    script_content = [
        Turn(speaker_id="Aza", text="Hello Rex! We are finally running on the native API voices."),
        Turn(speaker_id="Rex", text="That is great news, Aza. No more audio files to upload."),
        Turn(speaker_id="Aza", text="Exactly. I just use the name 'Aza', and you use 'Rex'."),
        Turn(speaker_id="Rex", text="Simple and efficient. Let's start the podcast."),
    ]

    # 3. Send Request
    podcast_request(
        GeneratePodcastModel(
            model="grok-voice",
            speakers=speakers_list,
            script=script_content,
            num_tts_blocks_history=4,
            response_format="mp3",
            sampling_params=DEFAULT_SAMPLING_PARAMS,
        ),
        output_file="stock_voices_podcast.mp3",
    )

if __name__ == "__main__":
    if not API_KEY:
        print("❌ Error: XAI_API_KEY environment variable is not set.")
    else:
        try:
            main()
        except Exception as e:
            print(f"\n❌ Error: {e}")
