"use client";

import { use, useEffect, useRef, useState, useCallback, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Play, Pause, Loader2 } from "lucide-react";
import { useSlideshow } from "@/hooks/use-slideshow";
import { useExpertise } from "@/hooks/use-expertise";
import { useContentTopics } from "@/hooks/use-content-topics";
import { Card, CardContent } from "@/components/ui/card";

export default function VideoPage({
  params,
}: {
  params: Promise<{ id: string; expertiseId: string; videoId: string }>;
}) {
  const { id, expertiseId, videoId } = use(params);
  const router = useRouter();

  const expertise = useExpertise(id);
  const expertiseTopic = expertise?.find((t) => t.id === expertiseId);

  const { contentTopics } = useContentTopics({ id, expertiseId, expertiseTopic });
  const videoTopic = contentTopics?.video;

  const { slideshow, loading } = useSlideshow({
    id,
    expertiseId,
    videoId,
    expertiseTopic,
    videoTopic,
  });

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioCacheRef = useRef<Record<number, string>>({});
  const autoPlayNextRef = useRef(false);
  const hasUserInteractedRef = useRef(false);

  // Debug logging
  console.log("Video Page Debug:", {
    id,
    expertiseId,
    videoId,
    hasExpertiseTopic: !!expertiseTopic,
    hasVideoTopic: !!videoTopic,
    hasSlideshow: !!slideshow,
    loading,
  });

  const resetPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setIsBuffering(false);
    setCurrentTime(0);
    setDuration(0);
  };

  const handleNext = () => {
    if (slideshow && currentSlideIndex < slideshow.slides.length - 1) {
      resetPlayback();
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSlideIndex > 0) {
      resetPlayback();
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const slide = slideshow?.slides[currentSlideIndex];

  // Clean up cached blob URLs on unmount
  useEffect(() => {
    const cacheAtMount = audioCacheRef.current;
    return () => {
      Object.values(cacheAtMount).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const fetchAudioForSlide = useCallback(
    async (index: number, options?: { suppressBuffering?: boolean }) => {
      const suppressBuffering = options?.suppressBuffering;
      if (!slideshow) return null;
      if (audioCacheRef.current[index]) return audioCacheRef.current[index];

      const slideForAudio = slideshow.slides[index];
      if (!slideForAudio) return null;

      if (!suppressBuffering) {
        setIsBuffering(true);
      }
      try {
        const makeRequest = async () =>
          fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: slideForAudio.audioTranscript,
              voice: "None",
              instructions: "Use a confident, calm, professional male narrator voice",
              format: "mp3",
            }),
          });

        let response = await makeRequest();

        // If upstream timed out, retry once
        if (response.status === 502 || response.status === 504) {
          console.warn("⚠️ TTS timed out, retrying once...");
          response = await makeRequest();
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ TTS request failed:", errorText);
          throw new Error("TTS request failed");
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.startsWith("audio/")) {
          const errorText = await response.text();
          console.error("❌ Unexpected TTS content-type:", contentType, "body:", errorText);
          return null;
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        audioCacheRef.current[index] = url;
        return url;
      } catch (error) {
        console.error("❌ Unable to fetch slide audio:", error);
        return null;
      } finally {
        if (!suppressBuffering) {
          setIsBuffering(false);
        }
      }
    },
    [slideshow]
  );

  const handlePlayPause = async () => {
    if (!audioRef.current || slide === undefined) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        hasUserInteractedRef.current = true;
        let urlToUse = audioUrl;
        if (!urlToUse) {
          urlToUse = await fetchAudioForSlide(currentSlideIndex);
          if (urlToUse) {
            setAudioUrl(urlToUse);
          }
        }

        if (!urlToUse) {
          console.error("❌ No audio source available after fetch");
          return;
        }

        if (audioRef.current.src !== urlToUse) {
          audioRef.current.src = urlToUse;
          audioRef.current.load();
        }

        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error("❌ Unable to start playback:", error);
        setIsPlaying(false);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      const metaDuration = audioRef.current.duration;
      if (duration === 0 && isFinite(metaDuration) && metaDuration > 0) {
        setDuration(metaDuration);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: ChangeEvent<HTMLInputElement>) => {
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
  const displayDuration =
    duration > 0 && isFinite(duration) ? duration : Math.max(currentTime, 1);

  const handleAudioEnded = () => {
    setIsPlaying(false);
    if (slideshow && currentSlideIndex < slideshow.slides.length - 1) {
      autoPlayNextRef.current = true;
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  // Preload audio when slide changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setIsBuffering(false);
    setCurrentTime(0);
    setDuration(0);
    setAudioUrl(null);
  }, [currentSlideIndex]);

  // Auto-play when advancing via audio end
  useEffect(() => {
    if (!autoPlayNextRef.current) return;
    autoPlayNextRef.current = false;

    const playNext = async () => {
      if (!hasUserInteractedRef.current) return;
      const url = await fetchAudioForSlide(currentSlideIndex);
      if (url && audioRef.current) {
        setAudioUrl(url);
        audioRef.current.src = url;
        audioRef.current.load();
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (error) {
          console.error("❌ Unable to auto-play next slide:", error);
          setIsPlaying(false);
        }
      }
    };

    playNext();
  }, [currentSlideIndex, fetchAudioForSlide]);

  // Auto-play on initial load
  useEffect(() => {
    const autoPlayFirst = async () => {
      if (!slideshow || !slide || !hasUserInteractedRef.current) return;
      const url = await fetchAudioForSlide(currentSlideIndex);
      if (url && audioRef.current) {
        setAudioUrl(url);
        audioRef.current.src = url;
        audioRef.current.load();
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (error) {
          console.error("❌ Unable to auto-play first slide:", error);
          setIsPlaying(false);
        }
      }
    };
    autoPlayFirst();
    // Only run once on mount / initial slideshow load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideshow]);

  if (loading || !slideshow || !slideshow.slides || slideshow.slides.length === 0) {
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
        <div className="max-w-5xl mx-auto w-full space-y-8">
          <header className="space-y-3">
            <div className="h-10 w-2/3 rounded-md bg-muted animate-pulse" />
            <div className="h-4 w-1/2 rounded-md bg-muted animate-pulse" />
          </header>

          <Card className="overflow-hidden">
            <CardContent className="p-12 min-h-[500px] flex flex-col justify-start space-y-8">
              <div className="h-12 w-3/4 rounded-md bg-muted animate-pulse" />

              <ul className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <li key={i} className="flex items-start gap-4">
                    <span className="h-6 w-6 rounded-full bg-muted animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-5/6 rounded-md bg-muted animate-pulse" />
                      <div className="h-4 w-2/3 rounded-md bg-muted animate-pulse" />
                    </div>
                  </li>
                ))}
              </ul>

              <div className="pt-8 border-t border-border flex flex-col items-center gap-4">
                <div className="h-10 w-40 rounded-md bg-muted animate-pulse" />
                <div className="w-full space-y-2">
                  <div className="h-2 w-full rounded-full bg-muted animate-pulse" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="h-3 w-10 rounded bg-muted animate-pulse" />
                    <span className="h-3 w-10 rounded bg-muted animate-pulse" />
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-6 space-y-3">
                <div className="h-5 w-24 rounded bg-muted animate-pulse" />
                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-muted animate-pulse" />
                  <div className="h-3 w-5/6 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center">
            <div className="h-10 w-28 rounded-md bg-muted animate-pulse" />
            <div className="flex gap-2 overflow-x-auto max-w-md">
              {[...Array(6)].map((_, idx) => (
                <div key={idx} className="w-8 h-8 rounded-full border-2 border-muted animate-pulse" />
              ))}
            </div>
            <div className="h-10 w-28 rounded-md bg-muted animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  // Safety check for slide data
  if (!slide || !slide.bullets) {
    return null;
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

      <div className="max-w-5xl mx-auto w-full space-y-8">
        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-4xl font-bold">{videoTopic?.title}</h1>
          <p className="text-lg text-muted-foreground">{videoTopic?.description}</p>
        </header>

        {/* Slide Card */}
        <Card className="overflow-hidden">
          <CardContent className="p-12 min-h-[500px] flex flex-col justify-start">
            {/* Slide Content */}
            <div className="space-y-8">
              <h2 className="text-5xl font-bold">{slide.title}</h2>

              <ul className="space-y-4 text-xl">
                {slide.bullets.map((bullet, index) => (
                  <li key={index} className="flex items-start gap-4">
                    <span className="text-primary text-2xl flex-shrink-0">•</span>
                    <span className="leading-relaxed">{bullet}</span>
                  </li>
                ))}
              </ul>

              {/* Audio Player */}
              <div className="mt-8 pt-8 border-t border-border flex flex-col items-center gap-4">
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
                {(audioUrl || duration > 0) && (
                  <div className="w-full space-y-2">
                    <input
                      type="range"
                      min="0"
                      max={displayDuration}
                      value={Math.min(currentTime, displayDuration)}
                      onChange={handleSeek}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(displayDuration)}</span>
                    </div>
                  </div>
                )}

                {/* Hidden audio element */}
                <audio
                  ref={audioRef}
                  preload="auto"
                  onCanPlay={handleCanPlay}
                  onWaiting={handleWaiting}
                  onPlaying={handlePlaying}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={handleAudioEnded}
                  onPause={() => setIsPlaying(false)}
                  onError={() => setIsPlaying(false)}
                  className="hidden"
                />
              </div>

              {/* Audio Transcript - Similar to podcast page */}
              <div className="border-t border-border pt-6 space-y-4">
                <h3 className="font-semibold text-lg">Transcript</h3>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {slide.audioTranscript}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentSlideIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {/* Slide Indicators */}
          <div className="flex gap-2 overflow-x-auto max-w-md">
            {slideshow.slides.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  resetPlayback();
                  setCurrentSlideIndex(index);
                }}
                className={`flex-shrink-0 w-8 h-8 rounded-full border-2 transition-all ${
                  index === currentSlideIndex
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <Button
            onClick={handleNext}
            disabled={currentSlideIndex === slideshow.slides.length - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </main>
  );
}
