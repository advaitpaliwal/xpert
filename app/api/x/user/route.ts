import { NextRequest, NextResponse } from "next/server";
import { getXClient } from "@/lib/x-client";

interface XApiUser {
  id: string;
  username: string;
  name: string;
  description?: string;
  profile_image_url?: string;
  profile_banner_url?: string;
  verified?: boolean;
  verified_type?: string;
  location?: string;
  url?: string;
  entities?: unknown;
  affiliation?: unknown;
  public_metrics?: {
    followers_count?: number;
    following_count?: number;
  };
  created_at?: string;
  pinnedTweetId?: string;
}

interface XApiTweet {
  id: string;
  text: string;
  created_at?: string;
  public_metrics?: {
    like_count?: number;
    retweet_count?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    const client = getXClient();

    // Fetch user profile by username
    const userResponse = await client.users.getByUsername(username, {
      "user.fields": [
        "description",
        "created_at",
        "public_metrics",
        "verified",
        "verified_type",
        "profile_image_url",
        "profile_banner_url",
        "location",
        "url",
        "entities",
        "pinned_tweet_id",
        "affiliation",
      ],
      expansions: ["pinned_tweet_id"],
      "tweet.fields": ["text", "public_metrics", "created_at", "entities"],
    });

    if (!userResponse.data) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const user = userResponse.data as unknown as XApiUser;
    const includes = userResponse.includes;

    // Debug: Log what we're actually getting
    console.log("User response:", JSON.stringify(user, null, 2));

    // Fetch user's recent tweets
    const tweetsResponse = await client.users.getPosts(user.id, {
      maxResults: 100, // 100 is the max per request
      "tweet.fields": ["created_at", "public_metrics", "text"],
      exclude: ["retweets", "replies"], // Only original tweets
    });

    const tweets = (tweetsResponse.data || []) as unknown as XApiTweet[];

    // Get pinned tweet if available
    const pinnedTweet = (includes?.tweets?.find((t) => t.id === user.pinnedTweetId)) as unknown as XApiTweet | undefined;

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        description: user.description,
        profileImageUrl: user.profile_image_url,
        profileBannerUrl: user.profile_banner_url,
        verified: user.verified,
        verifiedType: user.verified_type,
        location: user.location,
        url: user.url,
        entities: user.entities,
        affiliation: user.affiliation,
        metrics: user.public_metrics ? {
          followersCount: user.public_metrics.followers_count,
          followingCount: user.public_metrics.following_count,
        } : undefined,
        createdAt: user.created_at,
        pinnedTweet: pinnedTweet ? {
          id: pinnedTweet.id,
          text: pinnedTweet.text,
          metrics: pinnedTweet.public_metrics ? {
            likeCount: pinnedTweet.public_metrics.like_count,
            retweetCount: pinnedTweet.public_metrics.retweet_count,
          } : undefined,
        } : undefined,
      },
      tweets: tweets.map((tweet) => ({
        id: tweet.id,
        text: tweet.text,
        createdAt: tweet.created_at,
        metrics: tweet.public_metrics ? {
          likeCount: tweet.public_metrics.like_count,
          retweetCount: tweet.public_metrics.retweet_count,
        } : undefined,
      })),
    });
  } catch (error) {
    console.error("Error fetching X user data:", error);
    return NextResponse.json(
      { error: "Failed to fetch user data from X" },
      { status: 500 }
    );
  }
}
