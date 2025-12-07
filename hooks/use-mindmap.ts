import { useQuery } from "@tanstack/react-query";
import { type Topic, type Mindmap } from "@/lib/schemas";

interface UseMindmapParams {
  id: string;
  expertiseId: string;
  mindmapId: string;
  expertiseTopic?: Topic;
}

export function useMindmap({
  id,
  expertiseId,
  mindmapId,
  expertiseTopic,
}: UseMindmapParams) {
  const { data: mindmap, isLoading } = useQuery({
    queryKey: ["mindmap", id, expertiseId, mindmapId],
    queryFn: async () => {
      if (!expertiseTopic) {
        throw new Error("Topic not found");
      }

      const response = await fetch("/api/mindmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: id,
          expertiseTopic: expertiseTopic.title,
          expertiseDescription: expertiseTopic.description,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch mindmap");
      }

      const data = await response.json();
      return data.mindmap as Mindmap;
    },
    enabled: !!expertiseTopic,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return {
    mindmap: mindmap ?? null,
    loading: isLoading,
  };
}
