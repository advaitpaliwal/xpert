import { NextRequest, NextResponse } from "next/server";
import { xai } from "@ai-sdk/xai";
import { generateObject } from "ai";
import { TopicsWithProfileSchema, generateId, type Topics } from "@/lib/schemas";

interface XUserData {
  user: {
    id: string;
    username: string;
    name: string;
    description?: string;
    profileImageUrl?: string;
    profileBannerUrl?: string;
    verified?: boolean;
    verifiedType?: string;
    location?: string;
    url?: string;
    entities?: unknown;
    affiliation?: unknown;
    metrics?: {
      followersCount?: number;
      followingCount?: number;
    };
    createdAt?: string;
    pinnedTweet?: {
      id: string;
      text: string;
      metrics?: {
        likeCount?: number;
        retweetCount?: number;
      };
    };
  };
  tweets: Array<{
    id: string;
    text: string;
    createdAt?: string;
    metrics?: {
      likeCount?: number;
      retweetCount?: number;
    };
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user, tweets }: XUserData = body;

    if (!user || !tweets) {
      return NextResponse.json(
        { error: "User and tweets data are required" },
        { status: 400 }
      );
    }

    // Create a comprehensive prompt with real data
    const tweetTexts = tweets.map((t) => t.text).join("\n\n");

    // Debug: Log incoming user data
    console.log("Incoming user data metrics:", JSON.stringify(user.metrics, null, 2));

    const result = await generateObject({
      model: xai("grok-4-1-fast-non-reasoning"),
      schema: TopicsWithProfileSchema,
      system:
        "You are an expert at analyzing social media profiles and identifying key areas of expertise. Analyze the user's actual bio and tweets to identify what topics they are truly an expert in. The goal is that a user is trying to learn the topics the provided person is an expert at.",
      prompt: `Analyze this X (Twitter) user and identify exactly 4 broad expertise topics they are known for based on their real profile and content. If they are someone famous, well known, just use their expertise as the topic instead of the posts. The posts are just examples of what they have recently been posting about. The posts can be misleading, so use your best judgement to determine what they are truly an expert in. Ideally it should be a short specific topic that is educational and someone else would benefit from. They should be first principle topics that a university course could be taught on. These are university course topics basically.

Username: @${user.username}
Name: ${user.name}
Bio: ${user.description || "No bio available"}
${user.location ? `Location: ${user.location}` : ""}
${user.url ? `Website: ${user.url}` : ""}
${user.verifiedType ? `Verification: ${user.verifiedType}` : ""}
${user.pinnedTweet ? `\nPinned Tweet: ${user.pinnedTweet.text}` : ""}

Recent tweets (${tweets.length} original posts):
${tweetTexts}

Based on this REAL data, identify 4 broad expertise topics and create a fun, quirky, punchy descriptor for who they are. Be creative and playful with the descriptor - make it memorable and unique to their personality and expertise shown in their actual content.`,
    });

    const topics: Topics = result.object.topics.map((topic) => ({
      ...topic,
      id: generateId(topic.title),
    }));

    const response = {
      topics,
      profileDescription: result.object.profileDescription,
      userProfile: {
        name: user.name,
        username: user.username,
        profileImageUrl: user.profileImageUrl,
        profileBannerUrl: user.profileBannerUrl,
        verified: user.verified,
        verifiedType: user.verifiedType,
        location: user.location,
        url: user.url,
        metrics: user.metrics,
        pinnedTweet: user.pinnedTweet,
      }
    };

    // Debug: Log outgoing response
    console.log("Outgoing userProfile:", JSON.stringify(response.userProfile, null, 2));

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error generating topics:", error);
    return NextResponse.json(
      { error: "Failed to generate topics" },
      { status: 500 }
    );
  }
}
