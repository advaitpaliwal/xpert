import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/cache-config";
import { cacheImageFromUrl } from "@/lib/indexeddb-cache";

interface UsePrefetchExpertiseOptions {
  expertise: Array<{ id: string; imageUrl?: string }>;
  currentIndex?: number;
  enabled?: boolean;
}

export function usePrefetchExpertise({
  expertise,
  currentIndex = 0,
  enabled = true,
}: UsePrefetchExpertiseOptions) {
  useEffect(() => {
    if (!enabled || !expertise || expertise.length === 0) return;

    // Prefetch next 2 expertise images
    const nextTopics = expertise.slice(
      currentIndex + 1,
      currentIndex + 3
    );

    nextTopics.forEach((topic) => {
      if (topic.imageUrl) {
        // Prefetch image to IndexedDB
        cacheImageFromUrl(topic.id, topic.imageUrl).catch((error) => {
          console.log("Failed to prefetch image:", error);
        });
      }
    });
  }, [expertise, currentIndex, enabled]);
}

interface UsePrefetchContentOptions {
  id: string;
  expertiseId: string;
  expertiseTopic: { title: string; description: string } | undefined;
  enabled?: boolean;
}

export function usePrefetchContent({
  id,
  expertiseId,
  expertiseTopic,
  enabled = true,
}: UsePrefetchContentOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !expertiseTopic) return;

    // Prefetch content topics
    const contentTopicsKey = queryKeys.contentTopics(id, expertiseId);

    queryClient.prefetchQuery({
      queryKey: contentTopicsKey,
      queryFn: async () => {
        const response = await fetch("/api/generate/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: id,
            expertiseTopic: expertiseTopic.title,
            expertiseDescription: expertiseTopic.description,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to prefetch content topics");
        }

        return response.json();
      },
      staleTime: Infinity,
    });
  }, [id, expertiseId, expertiseTopic, queryClient, enabled]);
}

interface UsePrefetchPodcastScriptOptions {
  params: {
    username: string;
    expertiseTopic: string;
    expertiseDescription: string;
    audioTitle: string;
    audioDescription: string;
  } | null;
  enabled?: boolean;
}

export function usePrefetchPodcastScript({
  params,
  enabled = true,
}: UsePrefetchPodcastScriptOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !params) return;

    // Prefetch podcast script
    const scriptKey = queryKeys.podcastScript(params);

    queryClient.prefetchQuery({
      queryKey: scriptKey,
      queryFn: async () => {
        const response = await fetch(
          `/api/podcast/script?${new URLSearchParams(params).toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to prefetch podcast script");
        }

        return response.json();
      },
      staleTime: Infinity,
    });
  }, [params, queryClient, enabled]);
}

interface UsePrefetchImagesOptions {
  imageUrls: string[];
  enabled?: boolean;
}

export function usePrefetchImages({
  imageUrls,
  enabled = true,
}: UsePrefetchImagesOptions) {
  useEffect(() => {
    if (!enabled || imageUrls.length === 0) return;

    imageUrls.forEach((url, index) => {
      if (url) {
        // Prefetch images to IndexedDB
        cacheImageFromUrl(`prefetch-${index}-${Date.now()}`, url).catch(
          (error) => {
            console.log("Failed to prefetch image:", error);
          }
        );
      }
    });
  }, [imageUrls, enabled]);
}

// Combined hook for comprehensive prefetching on expertise page
export function usePrefetchExpertisePage({
  id,
  expertise,
  currentExpertiseIndex,
  enabled = true,
}: {
  id: string;
  expertise: Array<{
    id: string;
    title: string;
    description: string;
    imageUrl?: string;
  }>;
  currentExpertiseIndex: number;
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || expertise.length === 0) return;

    // Prefetch next expertise topic's content
    const nextTopic = expertise[currentExpertiseIndex + 1];
    if (nextTopic) {
      // Prefetch image
      if (nextTopic.imageUrl) {
        cacheImageFromUrl(nextTopic.id, nextTopic.imageUrl).catch(() => {});
      }

      // Prefetch content topics
      const contentTopicsKey = queryKeys.contentTopics(id, nextTopic.id);
      queryClient.prefetchQuery({
        queryKey: contentTopicsKey,
        queryFn: async () => {
          const response = await fetch("/api/generate/content", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: id,
              expertiseTopic: nextTopic.title,
              expertiseDescription: nextTopic.description,
            }),
          });

          if (!response.ok) throw new Error("Failed to prefetch");
          return response.json();
        },
        staleTime: Infinity,
      });
    }
  }, [id, expertise, currentExpertiseIndex, queryClient, enabled]);
}
