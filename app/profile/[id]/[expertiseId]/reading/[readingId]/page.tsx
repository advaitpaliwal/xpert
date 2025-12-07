"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Streamdown } from "streamdown";
import Image from "next/image";
import { useReadingContent } from "@/hooks/use-reading-content";
import { useExpertise } from "@/hooks/use-expertise";
import { useContentTopics } from "@/hooks/use-content-topics";
import { useTopicImage } from "@/hooks/use-topic-image";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReadingPage({
  params,
}: {
  params: Promise<{ id: string; expertiseId: string; readingId: string }>;
}) {
  const { id, expertiseId, readingId } = use(params);
  const router = useRouter();

  const expertise = useExpertise(id);
  const expertiseTopic = expertise?.find((t) => t.id === expertiseId);
  const { contentTopics } = useContentTopics({ id, expertiseId, expertiseTopic });
  const readingTopic = contentTopics?.reading.find((r) => r.id === readingId);

  // Use the same image hook which pulls from React Query cache
  const { imageUrl } = useTopicImage(
    readingTopic?.imagePrompt || "",
    readingTopic?.id || ""
  );

  const { content, loading, isStreaming } = useReadingContent({
    id,
    expertiseId,
    readingId,
    expertiseTopic,
    readingTopic,
  });

  return (
    <main className="relative min-h-screen flex flex-col pt-20 px-4 pb-20 font-sans">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="fixed top-4 left-4 z-50"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </Button>

      <article className="max-w-4xl mx-auto w-full">
        <header className="mb-8">
          {imageUrl && (
            <div className="w-full aspect-[21/9] rounded-xl overflow-hidden mb-6 relative">
              <Image
                src={imageUrl}
                alt={readingTopic?.title || ""}
                fill
                className="object-cover"
              />
            </div>
          )}
          <h1 className="text-5xl font-bold mb-4">{readingTopic?.title}</h1>
          <p className="text-xl text-muted-foreground">{readingTopic?.description}</p>
        </header>

        <div className="prose prose-lg dark:prose-invert max-w-none">
          <Streamdown isAnimating={isStreaming}>{content ?? ""}</Streamdown>
        </div>
      </article>
    </main>
  );
}
