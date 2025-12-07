"use client";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";
import { useTopicImage } from "@/hooks/use-topic-image";
import Image from "next/image";

interface ImageCardProps {
  imageUrl?: string;
  imagePrompt?: string;
  topicId: string;
  alt: string;
  aspectRatio?: number;
  className?: string;
}

export function ImageCard({
  imageUrl: initialImageUrl,
  imagePrompt,
  topicId,
  alt,
  aspectRatio = 16 / 9,
  className = "",
}: ImageCardProps) {
  const { imageUrl: generatedImageUrl, loading } = useTopicImage(imagePrompt || "", topicId);
  const imageUrl = initialImageUrl || generatedImageUrl;

  return (
    <AspectRatio ratio={aspectRatio} className={className}>
      {loading && !imageUrl ? (
        <Skeleton className="w-full h-full" />
      ) : imageUrl ? (
        <Image
          src={imageUrl}
          alt={alt}
          fill
          className="object-cover"
        />
      ) : (
        <Skeleton className="w-full h-full" />
      )}
    </AspectRatio>
  );
}
