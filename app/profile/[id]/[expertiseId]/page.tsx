"use client";

import { use } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type Topic } from "@/lib/schemas";
import { useContentTopics } from "@/hooks/use-content-topics";
import { useExpertise } from "@/hooks/use-expertise";
import { ImageCard } from "@/components/image-card";
import { useTopicImage } from "@/hooks/use-topic-image";
import Image from "next/image";


export default function ExpertisePage({ params }: { params: Promise<{ id: string; expertiseId: string }> }) {
    const { id, expertiseId } = use(params);
    const router = useRouter();
    const generatedExpertise = useExpertise(id);
    const generatedTopic = generatedExpertise?.find((topic) => topic.id === expertiseId);
    const { contentTopics, loading } = useContentTopics({ id, expertiseId, expertiseTopic: generatedTopic });

    // Use the same image hook which pulls from React Query cache
    const { imageUrl } = useTopicImage(
        generatedTopic?.imagePrompt || "",
        generatedTopic?.id || ""
    );

    if (!contentTopics && !loading && !generatedTopic) return <div>Expertise not found</div>;

    const displayTitle = generatedTopic?.title || expertiseId;
    const displayDescription = generatedTopic?.description || "";

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

            <div className="max-w-4xl mx-auto w-full space-y-8">
                {/* Header */}
                <header className="flex flex-col gap-6">
                    {imageUrl && (
                        <div className="w-full aspect-[21/9] rounded-xl overflow-hidden relative">
                            <Image
                                src={imageUrl}
                                alt={displayTitle}
                                fill
                                loading="eager"
                                className="object-cover"
                            />
                        </div>
                    )}
                    <div className="flex flex-col gap-4">
                        <h1 className="text-4xl font-bold">{displayTitle}</h1>
                        <p className="text-lg text-muted-foreground">{displayDescription}</p>
                    </div>
                </header>

                {/* Preload all images */}
                {contentTopics && generatedTopic && (
                    <div className="hidden">
                        <ImagePreloader items={[
                            contentTopics.reading,
                            contentTopics.video,
                            contentTopics.audio,
                            generatedTopic,
                        ]} />
                    </div>
                )}

                {/* All Content Sections - Horizontal Layout */}
                {loading ? (
                    <AllContentSkeleton />
                ) : (
                    <div className="grid grid-cols-4 gap-8">
                        {/* Read Section */}
                        {contentTopics && (
                            <ContentSection
                                title="Read"
                                icon="📚"
                            >
                                <TopicGrid items={[contentTopics.reading]} type="reading" username={id} expertiseId={expertiseId} />
                            </ContentSection>
                        )}

                        {/* Watch Section */}
                        {contentTopics && (
                            <ContentSection
                                title="Watch"
                                icon="📺"
                            >
                                <TopicGrid items={[contentTopics.video]} type="watching" username={id} expertiseId={expertiseId} />
                            </ContentSection>
                        )}

                        {/* Listen Section */}
                        {contentTopics && (
                            <ContentSection
                                title="Listen"
                                icon="🎧"
                            >
                                <TopicGrid items={[contentTopics.audio]} type="listening" username={id} expertiseId={expertiseId} />
                            </ContentSection>
                        )}

                        {/* Interact Section */}
                        {generatedTopic && (
                            <ContentSection
                                title="Interact"
                                icon="🎮"
                            >
                                <InteractiveGrid topic={generatedTopic} username={id} expertiseId={expertiseId} />
                            </ContentSection>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}

function ContentSection({
    title,
    icon,
    children
}: {
    title: string;
    icon: string;
    children: React.ReactNode;
}) {
    return (
        <section className="space-y-4">
            <div className="flex items-center gap-2">
                <span className="text-2xl">{icon}</span>
                <h2 className="text-xl font-bold">{title}</h2>
            </div>
            {children}
        </section>
    );
}

function AllContentSkeleton() {
    return (
        <div className="grid grid-cols-4 gap-8">
            {[
                { icon: "📚", title: "Read" },
                { icon: "📺", title: "Watch" },
                { icon: "🎧", title: "Listen" },
                { icon: "🎮", title: "Interact" }
            ].map((section) => (
                <section key={section.title} className="space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{section.icon}</span>
                        <h2 className="text-xl font-bold">{section.title}</h2>
                    </div>
                    <SkeletonGrid />
                </section>
            ))}
        </div>
    );
}

function TopicGrid({ items, type, username, expertiseId }: { items: Topic[]; type: string; username: string; expertiseId: string }) {
    return (
        <div className="space-y-4">
            {items.map((item) => (
                <TopicGridItem
                    key={item.id}
                    item={item}
                    type={type}
                    username={username}
                    expertiseId={expertiseId}
                />
            ))}
        </div>
    );
}

function InteractiveGrid({ topic, username, expertiseId }: { topic: Topic; username: string; expertiseId: string }) {
    const quizTopic = {
        ...topic,
        id: `${topic.id}-quiz`,
        title: `Quiz: ${topic.title}`,
        description: `Test your knowledge of ${topic.title} with interactive multiple choice questions`,
    };

    return (
        <div className="space-y-4">
            <Link href={`/profile/${username}/${expertiseId}/quiz/${quizTopic.id}`} className="block group cursor-pointer">
                <TopicGridContent item={quizTopic} />
            </Link>
        </div>
    );
}

function TopicGridItem({ item, type, username, expertiseId }: { item: Topic; type: string; username: string; expertiseId: string }) {
    const isReading = type === "reading";
    const isWatching = type === "watching";
    const isListening = type === "listening";
    const content = <TopicGridContent item={item} />;

    if (isReading) {
        return (
            <Link href={`/profile/${username}/${expertiseId}/reading/${item.id}`} className="block group cursor-pointer">
                {content}
            </Link>
        );
    }

    if (isWatching) {
        return (
            <Link href={`/profile/${username}/${expertiseId}/video/${item.id}`} className="block group cursor-pointer">
                {content}
            </Link>
        );
    }

    if (isListening) {
        return (
            <Link href={`/profile/${username}/${expertiseId}/audio/${item.id}`} className="block group cursor-pointer">
                {content}
            </Link>
        );
    }

    return (
        <div className="block group cursor-pointer">
            {content}
        </div>
    );
}

function TopicGridContent({ item }: { item: Topic }) {
    return (
        <div className="space-y-3">
            <div className="rounded-lg overflow-hidden bg-card border relative group-hover:border-primary/50 transition-colors">
                <ImageCard
                    imageUrl={item.imageUrl}
                    imagePrompt={item.imagePrompt}
                    topicId={item.id}
                    alt={item.title}
                    aspectRatio={3 / 4}
                />
            </div>
            <div>
                <h3 className="font-semibold text-base leading-tight">
                    {item.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
            </div>
        </div>
    );
}

function ImagePreloader({ items }: { items: Topic[] }) {
    return (
        <>
            {items.map((item) => (
                <ImageCard
                    key={item.id}
                    imageUrl={item.imageUrl}
                    imagePrompt={item.imagePrompt}
                    topicId={item.id}
                    alt={item.title}
                    aspectRatio={3 / 4}
                />
            ))}
        </>
    );
}

function SkeletonGrid() {
    return (
        <div className="space-y-4">
            <div className="space-y-3">
                <div className="rounded-lg overflow-hidden border aspect-3/4 animate-pulse bg-muted" />
                <div className="space-y-2">
                    <div className="h-5 bg-muted rounded animate-pulse w-3/4" />
                    <div className="h-4 bg-muted rounded animate-pulse w-full" />
                </div>
            </div>
        </div>
    );
}
