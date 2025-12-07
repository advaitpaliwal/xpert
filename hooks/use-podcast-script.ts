import { useQuery } from "@tanstack/react-query";

export interface PodcastTurn {
  speaker: "host" | "guest";
  text: string;
}

interface PodcastScriptParams {
  username: string;
  expertiseTopic: string;
  expertiseDescription: string;
  audioTitle: string;
  audioDescription: string;
}

async function fetchPodcastScript(params: PodcastScriptParams): Promise<{ turns: PodcastTurn[] }> {
  const searchParams = new URLSearchParams({
    username: params.username,
    expertiseTopic: params.expertiseTopic,
    expertiseDescription: params.expertiseDescription,
    audioTitle: params.audioTitle,
    audioDescription: params.audioDescription,
  });

  const response = await fetch(`/api/podcast/script?${searchParams.toString()}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to generate script" }));
    throw new Error(error.error || "Failed to generate podcast script");
  }

  return response.json();
}

export function usePodcastScript(params: PodcastScriptParams | null) {
  return useQuery({
    queryKey: ["podcast-script", params],
    queryFn: () => fetchPodcastScript(params!),
    enabled: !!params,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    retry: 2,
  });
}
