import { useQuery } from "@tanstack/react-query";

export function useProfileDescription(username: string) {
  const { data: profileDescription } = useQuery<string>({
    queryKey: ["profile", username],
    queryFn: () => {
      // Return null instead of throwing - this allows React Query persistence
      // to hydrate the data from localStorage without being blocked by an error.
      return null as unknown as string;
    },
    staleTime: Infinity, // Profile description doesn't change once generated
    gcTime: Infinity, // Keep in cache forever
    retry: false, // Don't retry if not in cache
    enabled: false, // Disable automatic fetching - data comes from mutations or persistence only
  });

  return profileDescription ?? null;
}
