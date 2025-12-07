import { Skeleton } from "@/components/ui/skeleton";

interface TopicCardSkeletonProps {
  aspectRatio?: number;
}

export function TopicCardSkeleton({ aspectRatio = 16 / 9 }: TopicCardSkeletonProps) {
  return (
    <div className="block h-full">
      <div className="rounded-xl overflow-hidden border bg-card h-full flex flex-col">
        {/* Image skeleton */}
        <div className="relative w-full" style={{ paddingTop: `${(1 / aspectRatio) * 100}%` }}>
          <Skeleton className="absolute inset-0 rounded-none" />
        </div>

        {/* Content skeleton */}
        <div className="p-6 flex-1 space-y-3">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    </div>
  );
}
