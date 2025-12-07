"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Member {
  username: string;
  full_name: string;
  profile_url: string;
  profile_image_url: string;
}

interface AnimatedMemberPillsProps {
  members: Member[];
  reverse?: boolean;
  duration?: number;
}

export function AnimatedMemberPills({
  members,
  reverse = false,
  duration = 60
}: AnimatedMemberPillsProps) {
  const router = useRouter();
  const [isPaused, setIsPaused] = useState(false);

  const handlePillClick = (username: string) => {
    router.push(`/profile/${username}`);
  };

  // Duplicate the members array to create seamless loop
  const duplicatedMembers = [...members, ...members];

  return (
    <div className="relative w-full overflow-hidden py-2">
      <div
        className="flex gap-3"
        style={{
          animation: `scroll ${duration}s linear infinite ${reverse ? 'reverse' : ''}`,
          animationPlayState: isPaused ? 'paused' : 'running',
        }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {duplicatedMembers.map((member, index) => (
          <Button
            key={`${member.username}-${index}`}
            variant="outline"
            className="h-10 rounded-full px-3 gap-2 flex-shrink-0 hover:bg-accent transition-colors"
            onClick={() => handlePillClick(member.username)}
          >
            <Image
              src={member.profile_image_url}
              alt={member.full_name}
              width={24}
              height={24}
              className="h-6 w-6 rounded-full"
            />
            @{member.username}
          </Button>
        ))}
      </div>
      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
