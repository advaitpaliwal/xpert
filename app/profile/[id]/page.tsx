"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProfileHeader } from "@/components/profile-header";
import { TopicCard } from "@/components/topic-card";
import { TopicCardSkeleton } from "@/components/topic-card-skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useExpertise } from "@/hooks/use-expertise";
import { useProfileDescription } from "@/hooks/use-profile-description";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useXUser } from "@/hooks/use-x-user";
import { useGenerateTopics } from "@/hooks/use-generate-topics";

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const expertise = useExpertise(id);
    const profileDescription = useProfileDescription(id);
    const userProfile = useUserProfile(id);

    const { mutate: fetchXUser, isPending: isFetchingXUser } = useXUser();
    const { mutate: generateTopics, isPending: isGeneratingTopics } = useGenerateTopics();

    // Check if we need to fetch data
    useEffect(() => {
        // If we don't have expertise data OR user profile data, trigger the fetch flow
        if ((!expertise || !userProfile) && !isFetchingXUser && !isGeneratingTopics) {
            // Step 1: Fetch X user data
            fetchXUser(
                { username: id },
                {
                    onSuccess: (xData) => {
                        // Step 2: Generate topics using X data
                        generateTopics(
                            { username: id, xUserData: { user: xData.user, tweets: xData.tweets } },
                            {
                                onSuccess: () => {},
                                onError: (error) => {
                                    console.error("Error generating topics:", error);
                                },
                            }
                        );
                    },
                    onError: (error) => {
                        console.error("Error fetching X user data:", error);
                    },
                }
            );
        }
    }, [id, expertise, userProfile, fetchXUser, generateTopics, isFetchingXUser, isGeneratingTopics]);

    // Use real data from X API if available, fallback to username
    const displayName = userProfile?.name ?? id.charAt(0).toUpperCase() + id.slice(1);
    const displayHandle = `@${userProfile?.username ?? id}`;
    const avatar = userProfile?.profileImageUrl;
    const banner = userProfile?.profileBannerUrl;
    const verified = userProfile?.verified;
    const verifiedType = userProfile?.verifiedType;
    const followerCount = userProfile?.metrics?.followersCount;
    const followingCount = userProfile?.metrics?.followingCount;

    const hasUserProfile = !!userProfile;

    // Show loading state only when fetching X data (no profile yet)
    if (isFetchingXUser && !hasUserProfile) {
        return (
            <main className="relative min-h-screen flex flex-col pt-20 px-4 pb-20 font-sans">
                <div className="max-w-4xl mx-auto w-full space-y-8">
                    {/* Profile skeleton */}
                    <div className="space-y-4">
                        <div className="h-48 bg-muted rounded-lg animate-pulse" />
                        <div className="flex gap-4 items-start">
                            <div className="w-24 h-24 rounded-full bg-muted animate-pulse" />
                            <div className="flex-1 space-y-3 pt-2">
                                <div className="h-8 w-48 bg-muted rounded animate-pulse" />
                                <div className="h-5 w-32 bg-muted rounded animate-pulse" />
                            </div>
                        </div>
                    </div>

                    {/* Topics skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-fr">
                        {[...Array(4)].map((_, i) => (
                            <TopicCardSkeleton key={i} />
                        ))}
                    </div>
                </div>
            </main>
        );
    }

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
                <ProfileHeader
                    name={displayName}
                    handle={displayHandle}
                    avatar={avatar}
                    banner={banner}
                    bio={profileDescription ?? undefined}
                    verified={verified}
                    verifiedType={verifiedType}
                    followerCount={followerCount}
                    followingCount={followingCount}
                />

                {/* Loading state: Show skeleton cards while generating topics */}
                {isGeneratingTopics && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-fr">
                        {[...Array(4)].map((_, i) => (
                            <TopicCardSkeleton key={i} />
                        ))}
                    </div>
                )}

                {/* Success state: Show expertise cards */}
                {!isGeneratingTopics && expertise && expertise.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-fr">
                        {expertise.map((topic) => (
                            <Link key={topic.id} href={`/profile/${id}/${topic.id}`}>
                                <TopicCard
                                    title={topic.title}
                                    description={topic.description}
                                    imageUrl={topic.imageUrl}
                                    imagePrompt={topic.imagePrompt}
                                    topicId={topic.id}
                                />
                            </Link>
                        ))}
                    </div>
                )}

                {/* Empty state: No expertise found */}
                {!isGeneratingTopics && (!expertise || expertise.length === 0) && (
                    <div className="flex items-center justify-center min-h-[30vh]">
                        <p className="text-muted-foreground">No expertise found</p>
                    </div>
                )}
            </div>
        </main>
    );
}
