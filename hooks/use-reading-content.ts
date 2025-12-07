import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { type Topic } from "@/lib/schemas";

interface UseReadingContentParams {
  id: string;
  expertiseId: string;
  readingId: string;
  expertiseTopic?: Topic;
  readingTopic?: Topic;
}

export function useReadingContent({
  id,
  expertiseId,
  readingId,
  expertiseTopic,
  readingTopic,
}: UseReadingContentParams) {
  const [streamedContent, setStreamedContent] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);

  const { data: content, isLoading } = useQuery({
    queryKey: ["readingContent", id, expertiseId, readingId],
    queryFn: async () => {
      if (!expertiseTopic || !readingTopic) {
        throw new Error("Topic not found");
      }

      const response = await fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: id,
          expertiseTopic: expertiseTopic.title,
          expertiseDescription: expertiseTopic.description,
          readingTitle: readingTopic.title,
          readingDescription: readingTopic.description,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to fetch reading content");
      }

      // Handle streaming
      setIsStreaming(true);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;
          setStreamedContent(fullContent);
        }

        return fullContent;
      } finally {
        setIsStreaming(false);
      }
    },
    enabled: !!expertiseTopic && !!readingTopic,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Use streamed content if streaming, otherwise use cached content
  const displayContent = isStreaming ? streamedContent : content;

  return {
    content: displayContent ?? null,
    loading: isLoading,
    isStreaming,
    readingTopic,
  };
}
