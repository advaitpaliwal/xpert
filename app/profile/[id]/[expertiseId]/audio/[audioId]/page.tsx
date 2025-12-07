"use client";

import { use, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Play, Pause, Volume2, Loader2 } from "lucide-react";
import { useExpertise } from "@/hooks/use-expertise";
import { useContentTopics } from "@/hooks/use-content-topics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePodcastScript } from "@/hooks/use-podcast-script";

export default function AudioPage({
  params,
}: {
  params: Promise<{ id: string; expertiseId: string; audioId: string }>;
}) {
  const { id, expertiseId } = use(params);
  const router = useRouter();

  const expertise = useExpertise(id);
  const expertiseTopic = expertise?.find((t) => t.id === expertiseId);

  const { contentTopics } = useContentTopics({ id, expertiseId, expertiseTopic });
  const audioTopic = contentTopics?.audio;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Step 1: Fetch the podcast script (shows while audio generates in background)
  const scriptParams = audioTopic && expertiseTopic ? {
    username: id,
    expertiseTopic: expertiseTopic.title,
    expertiseDescription: expertiseTopic.description,
    audioTitle: audioTopic.title,
    audioDescription: audioTopic.description,
  } : null;

  const { data: scriptData, isLoading: isLoadingScript, error: scriptError } = usePodcastScript(scriptParams);

  // Calculate estimated duration from script text (average speaking rate: ~150 words/min)
  const estimatedDuration = scriptData ? (() => {
    const totalText = scriptData.turns.map(t => t.text).join(' ');
    const wordCount = totalText.split(/\s+/).length;
    const wordsPerMinute = 150;
    return Math.ceil((wordCount / wordsPerMinute) * 60); // in seconds
  })() : 0;

  // Step 2: Build the audio URL (streams directly from API - no caching)
  const audioUrl = scriptParams ? `/api/podcast?${new URLSearchParams({
    username: scriptParams.username,
    expertiseTopic: scriptParams.expertiseTopic,
    expertiseDescription: scriptParams.expertiseDescription,
    audioTitle: scriptParams.audioTitle,
    audioDescription: scriptParams.audioDescription,
  }).toString()}` : null;

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleCanPlay = () => {
    setIsBuffering(false);
  };

  const handleWaiting = () => setIsBuffering(true);
  const handlePlaying = () => {
    setIsBuffering(false);
    setIsPlaying(true);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds) || seconds === 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Use real duration if available, otherwise use estimated duration
  const displayDuration = (duration > 0 && isFinite(duration)) ? duration : estimatedDuration;

  if (!audioTopic || !expertiseTopic) {
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
        <div className="max-w-3xl mx-auto w-full">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="aspect-video bg-muted rounded"></div>
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

      <div className="max-w-3xl mx-auto w-full space-y-8">
        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-4xl font-bold">{audioTopic.title}</h1>
          <p className="text-lg text-muted-foreground">{audioTopic.description}</p>
        </header>

        {/* Podcast Player Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🎧</span>
              Podcast Conversation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {scriptError ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <p className="text-lg font-medium text-destructive">Failed to generate podcast</p>
                <p className="text-sm text-muted-foreground">
                  {scriptError?.message || "An error occurred"}
                </p>
                <Button onClick={() => window.location.reload()}>Try Again</Button>
              </div>
            ) : isLoadingScript ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Volume2 className="h-12 w-12 animate-pulse text-primary" />
                <div className="text-center space-y-2">
                  <p className="text-lg font-medium">Generating your podcast...</p>
                  <p className="text-sm text-muted-foreground">
                    Creating script and audio - this takes about 30-60 seconds
                  </p>
                </div>
              </div>
            ) : scriptData && audioUrl ? (
              <>
                {/* Audio Player */}
                <div className="flex flex-col items-center gap-4">
                  <Button
                    onClick={handlePlayPause}
                    disabled={isBuffering}
                    size="lg"
                    className="gap-2 w-full max-w-xs"
                  >
                    {isBuffering ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading audio...
                      </>
                    ) : isPlaying ? (
                      <>
                        <Pause className="h-5 w-5" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-5 w-5" />
                        Play
                      </>
                    )}
                  </Button>

                  {/* Progress Bar */}
                  {audioUrl && displayDuration > 0 && (
                    <div className="w-full space-y-2">
                      <input
                        type="range"
                        min="0"
                        max={displayDuration}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(displayDuration)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Hidden audio element */}
                {audioUrl && (
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    preload="auto"
                    onCanPlay={handleCanPlay}
                    onWaiting={handleWaiting}
                    onPlaying={handlePlaying}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={() => setIsPlaying(false)}
                    onPause={() => setIsPlaying(false)}
                    className="hidden"
                  />
                )}

                {/* Show script */}
                <div className="border-t border-border pt-6 space-y-4">
                  <h3 className="font-semibold text-lg">Transcript</h3>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {scriptData.turns.map((turn, index) => (
                      <div key={index} className="space-y-1">
                        <p className="text-sm font-medium text-primary">
                          {turn.speaker === "host" ? "Aza" : "Rex"}:
                        </p>
                        <p className="text-sm text-muted-foreground pl-4">{turn.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
