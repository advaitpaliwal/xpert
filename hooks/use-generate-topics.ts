import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type Topics } from "@/lib/schemas";
import { type XUserData } from "./use-x-user";

interface GenerateTopicsParams {
  username: string;
  xUserData: XUserData;
}

interface UserProfile {
  name: string;
  username: string;
  profileImageUrl?: string;
  profileBannerUrl?: string;
  verified?: boolean;
  verifiedType?: string;
  location?: string;
  url?: string;
  metrics?: {
    followersCount?: number;
    followingCount?: number;
  };
  pinnedTweet?: {
    id: string;
    text: string;
    metrics?: {
      likeCount?: number;
      retweetCount?: number;
    };
  };
}

interface GenerateTopicsResponse {
  topics: Topics;
  profileDescription: string;
  userProfile: UserProfile;
}

export function useGenerateTopics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ username, xUserData }: GenerateTopicsParams) => {
      const response = await fetch("/api/generate/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(xUserData),
      });

      if (!response.ok) {
        throw new Error("Failed to generate topics");
      }

      const data: GenerateTopicsResponse = await response.json();
      return { username, ...data };
    },
    onSuccess: (data) => {
      // Cache the topics in React Query so they can be accessed by other pages
      queryClient.setQueryData(["expertise", data.username], data.topics);
      // Cache the profile description
      queryClient.setQueryData(["profile", data.username], data.profileDescription);
      // Cache the user profile data from X
      queryClient.setQueryData(["userProfile", data.username], data.userProfile);
    },
  });
}
