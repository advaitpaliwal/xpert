"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { ArrowUp } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [url, setUrl] = useState("");
  const router = useRouter();

  const handleGenerate = (username: string) => {
    // Immediately redirect to profile page
    router.push(`/profile/${username}`);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!url) return;

    // Remove @ if user included it, then use the username directly
    const username = url.replace("@", "").trim();
    if (!username) return;

    handleGenerate(username);
  };

  const handlePillClick = (handle: string) => {
    setUrl(handle);
    handleGenerate(handle);
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4 overflow-hidden">
      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-8xl tracking-tight">𝕏pert</span>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSubmit} className="relative w-full">
          <div className="relative w-full">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg text-muted-foreground pointer-events-none">
              @
            </span>
            <Input
              className="h-14 w-full rounded-full pl-10 pr-14 text-lg focus-visible:ring-offset-0"
              placeholder="username"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={!url.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-10 w-10 disabled:opacity-30"
          >
            <ArrowUp className="h-5.5! w-5.5!" />
          </Button>
        </form>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="outline"
            className="h-10 rounded-full px-3 gap-2"
            onClick={() => handlePillClick("elonmusk")}
          >
            <Image src="https://pbs.twimg.com/profile_images/1995407795835772928/Wp7m4L9h_400x400.jpg" alt="" width={24} height={24} className="h-6 w-6 rounded-full" />
            @elonmusk
          </Button>
          <Button
            variant="outline"
            className="h-10 rounded-full px-3 gap-2"
            onClick={() => handlePillClick("TheGregYang")}
          >
            <Image src="https://pbs.twimg.com/profile_images/1921265208984551424/ICfdqqjg_400x400.jpg" alt="" width={24} height={24} className="h-6 w-6 rounded-full" />
            @TheGregYang
          </Button>
          <Button
            variant="outline"
            className="h-10 rounded-full px-3 gap-2"
            onClick={() => handlePillClick("nikitabier")}
          >
            <Image src="https://pbs.twimg.com/profile_images/1755448801957945344/Fh2HNw5Y_400x400.jpg" alt="" width={24} height={24} className="h-6 w-6 rounded-full" />
            @nikitabier
          </Button>
          <Button
            variant="outline"
            className="h-10 rounded-full px-3 gap-2"
            onClick={() => handlePillClick("shadcn")}
          >
            <Image src="https://pbs.twimg.com/profile_images/1593304942210478080/TUYae5z7_400x400.jpg" alt="" width={24} height={24} className="h-6 w-6 rounded-full" />
            @shadcn
          </Button>
        </div>
      </div>
    </main>
  );
}
