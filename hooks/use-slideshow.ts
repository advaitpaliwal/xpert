import { useQuery } from "@tanstack/react-query";
import { type Topic, type Slideshow } from "@/lib/schemas";

interface UseSlideshowParams {
  id: string;
  expertiseId: string;
  videoId: string;
  expertiseTopic?: Topic;
  videoTopic?: Topic;
}

export function useSlideshow({
  id,
  expertiseId,
  videoId,
  expertiseTopic,
  videoTopic,
}: UseSlideshowParams) {
  const { data: slideshow, isLoading } = useQuery({
    queryKey: ["slideshow", id, expertiseId, videoId],
    queryFn: async () => {
      if (!expertiseTopic || !videoTopic) {
        throw new Error("Topic not found");
      }

      const response = await fetch("/api/slideshow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: id,
          expertiseTopic: expertiseTopic.title,
          expertiseDescription: expertiseTopic.description,
          videoTitle: videoTopic.title,
          videoDescription: videoTopic.description,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch slideshow");
      }

      const data = await response.json();
      return data.slideshow as Slideshow;
    },
    enabled: !!expertiseTopic && !!videoTopic,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return {
    slideshow: slideshow ?? null,
    loading: isLoading,
    videoTopic,
  };
}
