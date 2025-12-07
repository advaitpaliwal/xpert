import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BadgeCheck } from "lucide-react";
import Image from "next/image";

interface ProfileHeaderProps {
  name: string;
  handle: string;
  avatar?: string;
  banner?: string;
  bio?: string;
  verified?: boolean;
  verifiedType?: string;
  followerCount?: number;
  followingCount?: number;
}

export function ProfileHeader({
  name,
  handle,
  avatar,
  banner,
  bio,
  verified,
  verifiedType,
  followerCount,
  followingCount
}: ProfileHeaderProps) {
  const formatCount = (count?: number) => {
    if (!count) return "0";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="w-full -mt-20 -mx-4 sm:-mx-0">
      {/* Banner */}
      {banner && (
        <div className="w-full h-48 bg-muted overflow-hidden relative">
          <Image
            src={banner}
            alt={`${name}'s banner`}
            fill
            className="object-cover"
          />
        </div>
      )}
      {!banner && (
        <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-primary/5" />
      )}

      {/* Profile Info */}
      <div className="px-4 sm:px-0">
        <div className="flex items-end gap-4 -mt-12 mb-4">
          <Avatar className="w-24 h-24 border-4 border-background">
            <AvatarImage src={avatar} alt={name} />
            <AvatarFallback className="text-2xl">{name[0]}</AvatarFallback>
          </Avatar>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{name}</h1>
              {verified && (
                <BadgeCheck className="w-6 h-6 text-blue-500" />
              )}
            </div>
            <p className="text-muted-foreground">{handle}</p>
          </div>

          {bio && (
            <p className="text-base max-w-3xl">{bio}</p>
          )}

          {/* Follower/Following Counts */}
          {(followerCount !== undefined || followingCount !== undefined) && (
            <div className="flex gap-4 text-sm">
              {followingCount !== undefined && (
                <div>
                  <span className="font-semibold">{formatCount(followingCount)}</span>
                  <span className="text-muted-foreground ml-1">Following</span>
                </div>
              )}
              {followerCount !== undefined && (
                <div>
                  <span className="font-semibold">{formatCount(followerCount)}</span>
                  <span className="text-muted-foreground ml-1">Followers</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
