import { useQuery } from "@tanstack/react-query";
import { type ContentTopics, type Topic } from "@/lib/schemas";

interface UseContentTopicsParams {
  id: string;
  expertiseId: string;
  expertiseTopic?: Topic;
}

export function useContentTopics({ id, expertiseId, expertiseTopic }: UseContentTopicsParams) {
  const { data: contentTopics, isLoading: loading } = useQuery({
    queryKey: ["contentTopics", id, expertiseId],
    queryFn: async () => {
      if (!expertiseTopic) {
        throw new Error("Topic not found");
      }

      const response = await fetch("/api/generate/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicTitle: expertiseTopic.title,
          topicDescription: expertiseTopic.description,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate content topics");
      }

      const data = await response.json();
      const topics: ContentTopics = data.contentTopics;

      return topics;
    },
    enabled: !!expertiseTopic, // Only run query if we have the topic
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  return { contentTopics: contentTopics ?? null, loading };
}
