import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getInitials, getAvatarColor } from "../utils/helpers";
import { useBlobStorage } from "../hooks/useBlobStorage";

interface UserAvatarProps {
  displayName: string;
  avatarBlobId?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl",
};

export function UserAvatar({ displayName, avatarBlobId, size = "md", className }: UserAvatarProps) {
  const { getExternalBlobUrl } = useBlobStorage();
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  useEffect(() => {
    if (!avatarBlobId) {
      setAvatarUrl("");
      return;
    }
    if (avatarBlobId.startsWith("http")) {
      setAvatarUrl(avatarBlobId);
      return;
    }
    // Async fetch the URL
    getExternalBlobUrl(avatarBlobId).then(setAvatarUrl).catch(() => setAvatarUrl(""));
  }, [avatarBlobId, getExternalBlobUrl]);

  const initials = getInitials(displayName || "?");
  const bgColor = getAvatarColor(displayName || "?");

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
      <AvatarFallback
        style={{ backgroundColor: bgColor }}
        className="text-white font-semibold font-mono-display"
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
