import { useQuery } from "@tanstack/react-query";
import { type Topic, type Quiz } from "@/lib/schemas";

interface UseQuizParams {
  id: string;
  expertiseId: string;
  quizId: string;
  expertiseTopic?: Topic;
  quizTopic?: Topic;
}

export function useQuiz({
  id,
  expertiseId,
  quizId,
  expertiseTopic,
  quizTopic,
}: UseQuizParams) {
  const { data: quiz, isLoading } = useQuery({
    queryKey: ["quiz", id, expertiseId, quizId],
    queryFn: async () => {
      if (!expertiseTopic || !quizTopic) {
        throw new Error("Topic not found");
      }

      const response = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: id,
          expertiseTopic: expertiseTopic.title,
          expertiseDescription: expertiseTopic.description,
          quizTitle: quizTopic.title,
          quizDescription: quizTopic.description,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch quiz");
      }

      const data = await response.json();
      return data.quiz as Quiz;
    },
    enabled: !!expertiseTopic && !!quizTopic,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return {
    quiz: quiz ?? null,
    loading: isLoading,
    quizTopic,
  };
}
