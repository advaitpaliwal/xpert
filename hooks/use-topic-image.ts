import { useQuery } from "@tanstack/react-query";

export function useTopicImage(imagePrompt: string, topicId: string) {
  const { data: imageUrl, isLoading: loading } = useQuery({
    queryKey: ["topicImage", topicId],
    queryFn: async () => {
      const response = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: imagePrompt }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate image");
      }

      const data = await response.json();
      return data.imageUrl as string;
    },
    enabled: !!imagePrompt, // Only run query if we have a prompt
    staleTime: Infinity, // Images don't change, cache forever
    gcTime: Infinity, // Keep in cache forever
  });

  return { imageUrl, loading };
}
