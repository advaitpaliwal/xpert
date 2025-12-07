import { useQuery } from "@tanstack/react-query";

export interface UserProfile {
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

export function useUserProfile(username: string) {
  const { data: userProfile } = useQuery<UserProfile>({
    queryKey: ["userProfile", username],
    queryFn: () => {
      // Return null instead of throwing - this allows React Query persistence
      // to hydrate the data from localStorage without being blocked by an error.
      return null as unknown as UserProfile;
    },
    staleTime: Infinity, // User profile doesn't change once generated
    gcTime: Infinity, // Keep in cache forever
    retry: false, // Don't retry if not in cache
    enabled: false, // Disable automatic fetching - data comes from mutations or persistence only
  });

  console.log("=== RETRIEVING USER PROFILE ===");
  console.log("Username:", username);
  console.log("Retrieved user profile from cache:", JSON.stringify(userProfile, null, 2));
  console.log("Metrics:", JSON.stringify(userProfile?.metrics, null, 2));
  console.log("Profile image:", userProfile?.profileImageUrl);
  console.log("Banner:", userProfile?.profileBannerUrl);

  return userProfile ?? null;
}
