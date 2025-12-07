"use client";

import { ImageCard } from "@/components/image-card";

interface TopicCardProps {
  title: string;
  description: string;
  imageUrl?: string;
  imagePrompt?: string;
  topicId: string;
  aspectRatio?: number;
}

export function TopicCard({ title, description, imageUrl, imagePrompt, topicId, aspectRatio = 16 / 9 }: TopicCardProps) {
  return (
    <div className="block h-full">
      <div className="rounded-xl overflow-hidden border bg-card hover:border-primary/50 transition-colors h-full flex flex-col">
        <ImageCard
          imageUrl={imageUrl}
          imagePrompt={imagePrompt}
          topicId={topicId}
          alt={title}
          aspectRatio={aspectRatio}
        />
        <div className="p-6 flex-1">
          <h2 className="text-2xl font-bold mb-2">{title}</h2>
          <p className="text-muted-foreground text-base">{description}</p>
        </div>
      </div>
    </div>
  );
}
