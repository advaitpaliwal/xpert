"use client";

import { use, useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import { useMindmap } from "@/hooks/use-mindmap";
import { useExpertise } from "@/hooks/use-expertise";
import { useTopicImage } from "@/hooks/use-topic-image";
import { Transformer } from "markmap-lib";
import type { Markmap as MarkmapType } from "markmap-view";

export default function MindmapPage({
  params,
}: {
  params: Promise<{ id: string; expertiseId: string; mindmapId: string }>;
}) {
  const { id, expertiseId, mindmapId } = use(params);
  const router = useRouter();

  const expertise = useExpertise(id);
  const expertiseTopic = expertise?.find((t) => t.id === expertiseId);

  const { imageUrl } = useTopicImage(
    expertiseTopic?.imagePrompt || "",
    expertiseTopic?.id || ""
  );

  const { mindmap, loading } = useMindmap({
    id,
    expertiseId,
    mindmapId,
    expertiseTopic,
  });

  const svgRef = useRef<SVGSVGElement>(null);
  const mmRef = useRef<MarkmapType | null>(null);
  const [markmapLoaded, setMarkmapLoaded] = useState(false);

  useEffect(() => {
    // Dynamically import markmap-view
    import("markmap-view").then(() => {
      setMarkmapLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!svgRef.current || !mindmap?.markdown || !markmapLoaded) return;

    const initMarkmap = async () => {
      const { Markmap, loadCSS } = await import("markmap-view");

      // Create transformer
      const transformer = new Transformer();

      // Transform markdown to markmap data
      const { root, features } = transformer.transform(mindmap.markdown);

      // Get and load required assets (CSS/JS)
      const assets = transformer.getUsedAssets(features);
      if (assets.styles) {
        loadCSS(assets.styles);
      }

      // Create or update markmap
      if (!mmRef.current && svgRef.current) {
        mmRef.current = Markmap.create(svgRef.current, {
          embedGlobalCSS: false,
          style: () => `
            * { color: white !important; }
            text { fill: white !important; }
          `,
        }, root);
      } else if (mmRef.current) {
        mmRef.current.setData(root);
      }

      // Fit the view
      setTimeout(() => {
        mmRef.current?.fit();
      }, 100);
    };

    initMarkmap();

    // Cleanup
    return () => {
      if (mmRef.current) {
        mmRef.current.destroy();
        mmRef.current = null;
      }
    };
  }, [mindmap?.markdown, markmapLoaded]);

  if (loading || !mindmap) {
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
        <div className="max-w-7xl mx-auto w-full">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-[600px] bg-muted rounded"></div>
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

      <div className="max-w-7xl mx-auto w-full space-y-8">
        {/* Header */}
        <header className="space-y-4">
          {imageUrl && (
            <div className="w-full aspect-[21/9] rounded-xl overflow-hidden relative">
              <Image
                src={imageUrl}
                alt={expertiseTopic?.title || ""}
                fill
                className="object-cover"
              />
            </div>
          )}
          <h1 className="text-4xl font-bold">Mindmap: {expertiseTopic?.title}</h1>
          <p className="text-lg text-muted-foreground">
            Visual exploration of {expertiseTopic?.title} concepts and relationships
          </p>
        </header>

        {/* Markmap SVG */}
        <div className="w-full h-[600px] border-2 border-border rounded-xl overflow-hidden bg-background">
          <svg
            ref={svgRef}
            className="w-full h-full text-foreground"
          />
        </div>
      </div>
    </main>
  );
}
