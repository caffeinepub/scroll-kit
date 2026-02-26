import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Heart, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Post } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useToggleLike, useHasLiked, useGetProfile } from "../hooks/useQueries";
import { UserAvatar } from "./UserAvatar";
import { PostImage } from "./PostImage";
import { PostDetail } from "./PostDetail";
import { formatRelativeTime } from "../utils/helpers";

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const [showDetail, setShowDetail] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);

  const { data: authorProfile } = useGetProfile(post.authorPrincipal);
  const { data: hasLiked = false } = useHasLiked(post.id);
  const toggleLike = useToggleLike();

  const likeCount = Number(post.likeCount);
  const commentCount = Number(post.commentCount);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!identity) { toast.error("Sign in to like posts"); return; }
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 400);
    try {
      await toggleLike.mutateAsync(post.id);
    } catch {
      toast.error("Failed to toggle like");
    }
  };

  const handleDoubleClick = async () => {
    if (!identity || hasLiked) return;
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 400);
    try {
      await toggleLike.mutateAsync(post.id);
    } catch {
      // silent
    }
  };

  return (
    <>
      <article className="bg-card border border-border rounded-2xl overflow-hidden animate-fade-in hover:border-border/80 transition-colors">
        {/* Author header */}
        <div className="flex items-center gap-3 p-4">
          <button
            type="button"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            onClick={() => void navigate({ to: "/profile/$principalId", params: { principalId: post.authorPrincipal.toText() } })}
          >
            <UserAvatar
              displayName={authorProfile?.displayName ?? "?"}
              avatarBlobId={authorProfile?.avatarBlobId}
              size="sm"
            />
            <div className="text-left">
              <div className="font-semibold text-sm leading-tight">
                {authorProfile?.displayName ?? "Loading..."}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatRelativeTime(post.timestamp)}
              </div>
            </div>
          </button>
        </div>

        {/* Image */}
        <button
          type="button"
          className="w-full block"
          onClick={() => setShowDetail(true)}
          onDoubleClick={handleDoubleClick}
        >
          <PostImage
            imageBlobId={post.imageBlobId}
            aspectRatio="square"
            className="w-full cursor-pointer hover:opacity-95 transition-opacity"
          />
        </button>

        {/* Actions */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={handleLike}
              className={cn(
                "flex items-center gap-1.5 transition-colors group",
                likeAnimating && "animate-like",
                hasLiked
                  ? "text-red-500"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Heart
                className="h-6 w-6 transition-transform group-hover:scale-110"
                fill={hasLiked ? "currentColor" : "none"}
              />
              <span className="text-sm font-medium">{likeCount > 0 ? likeCount : ""}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDetail(true)}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors group"
            >
              <MessageCircle className="h-6 w-6 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">{commentCount > 0 ? commentCount : ""}</span>
            </button>
          </div>

          {/* Caption */}
          {post.caption && (
            <p className="text-sm">
              <span className="font-semibold mr-2">{authorProfile?.displayName}</span>
              <span className="text-foreground/90">{post.caption}</span>
            </p>
          )}

          {commentCount > 0 && (
            <button
              type="button"
              onClick={() => setShowDetail(true)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              View all {commentCount} comments
            </button>
          )}
        </div>
      </article>

      {showDetail && (
        <PostDetail post={post} onClose={() => setShowDetail(false)} />
      )}
    </>
  );
}
