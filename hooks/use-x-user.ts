import { useMutation, useQueryClient } from "@tanstack/react-query";

interface FetchXUserParams {
  username: string;
}

interface XUserTweet {
  id: string;
  text: string;
  createdAt?: string;
  metrics?: {
    likeCount?: number;
    retweetCount?: number;
  };
}

interface XUser {
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
}

export interface XUserData {
  user: XUser;
  tweets: XUserTweet[];
}

export function useXUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ username }: FetchXUserParams) => {
      const response = await fetch("/api/x/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch X user data");
      }

      const data: XUserData = await response.json();
      return { username, ...data };
    },
    onSuccess: (data) => {
      // Cache the X user data so it can be accessed by other components
      queryClient.setQueryData(["xUser", data.username], {
        user: data.user,
        tweets: data.tweets,
      });
    },
  });
}
