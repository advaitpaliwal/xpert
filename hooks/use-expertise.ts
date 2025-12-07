import { useQuery } from "@tanstack/react-query";
import { type Topics } from "@/lib/schemas";

export function useExpertise(username: string) {
  const { data: expertise } = useQuery<Topics>({
    queryKey: ["expertise", username],
    queryFn: () => {
      // Return null instead of throwing - this allows React Query persistence
      // to hydrate the data from localStorage without being blocked by an error.
      // If data isn't in cache and not persisted, components can handle the null case.
      return null as unknown as Topics;
    },
    staleTime: Infinity, // Expertise doesn't change once generated
    gcTime: Infinity, // Keep in cache forever
    retry: false, // Don't retry if not in cache
    enabled: false, // Disable automatic fetching - data comes from mutations or persistence only
  });

  return expertise ?? null;
}
