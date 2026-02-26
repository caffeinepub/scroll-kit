import { useState, useEffect } from "react";
import { useBlobStorage } from "../hooks/useBlobStorage";
import { cn } from "@/lib/utils";

interface PostImageProps {
  imageBlobId: string;
  alt?: string;
  className?: string;
  aspectRatio?: "square" | "auto";
}

export function PostImage({ imageBlobId, alt = "Post", className, aspectRatio = "square" }: PostImageProps) {
  const { getExternalBlobUrl } = useBlobStorage();
  const [imageUrl, setImageUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    if (!imageBlobId) {
      setLoading(false);
      return;
    }
    if (imageBlobId.startsWith("http")) {
      setImageUrl(imageBlobId);
      setLoading(false);
      return;
    }
    getExternalBlobUrl(imageBlobId)
      .then((url) => {
        setImageUrl(url);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [imageBlobId, getExternalBlobUrl]);

  if (loading) {
    return (
      <div
        className={cn(
          "bg-muted animate-pulse",
          aspectRatio === "square" && "aspect-square",
          className
        )}
      />
    );
  }

  if (error || !imageUrl) {
    return (
      <div
        className={cn(
          "bg-muted flex items-center justify-center",
          aspectRatio === "square" && "aspect-square",
          className
        )}
      >
        <span className="text-muted-foreground text-xs">Image unavailable</span>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={cn(
        "object-cover w-full",
        aspectRatio === "square" && "aspect-square",
        className
      )}
      onError={() => setError(true)}
    />
  );
}
