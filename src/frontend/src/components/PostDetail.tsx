import { useState, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Heart, MessageCircle, Send, X, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Post, Comment } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetComments,
  useAddComment,
  useDeleteComment,
  useToggleLike,
  useHasLiked,
  useDeletePost,
  useGetProfile,
} from "../hooks/useQueries";
import { UserAvatar } from "./UserAvatar";
import { PostImage } from "./PostImage";
import { formatRelativeTime } from "../utils/helpers";

interface PostDetailProps {
  post: Post;
  onClose: () => void;
}

interface CommentItemProps {
  comment: Comment;
  currentPrincipal: string | undefined;
  postId: bigint;
}

function CommentItem({ comment, currentPrincipal, postId }: CommentItemProps) {
  const { data: profile } = useGetProfile(comment.authorPrincipal);
  const deleteComment = useDeleteComment();
  const isOwn = currentPrincipal === comment.authorPrincipal.toText();

  const handleDelete = async () => {
    try {
      await deleteComment.mutateAsync({ commentId: comment.id, postId });
      toast.success("Comment deleted");
    } catch {
      toast.error("Failed to delete comment");
    }
  };

  return (
    <div className="flex gap-3 group animate-fade-in">
      <UserAvatar
        displayName={profile?.displayName ?? "?"}
        avatarBlobId={profile?.avatarBlobId}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <span className="font-semibold text-sm text-foreground mr-2">
              {profile?.displayName ?? "Unknown"}
            </span>
            <span className="text-sm text-foreground/90">{comment.content}</span>
          </div>
          {isOwn && (
            <button
              type="button"
              onClick={handleDelete}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{formatRelativeTime(comment.timestamp)}</span>
      </div>
    </div>
  );
}

export function PostDetail({ post, onClose }: PostDetailProps) {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const currentPrincipal = identity?.getPrincipal().toText();
  const isOwnPost = currentPrincipal === post.authorPrincipal.toText();

  const [commentText, setCommentText] = useState("");
  const [likeAnimating, setLikeAnimating] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const { data: authorProfile } = useGetProfile(post.authorPrincipal);
  const { data: comments = [], isLoading: commentsLoading } = useGetComments(post.id);
  const { data: hasLiked = false } = useHasLiked(post.id);
  const toggleLike = useToggleLike();
  const addComment = useAddComment();
  const deletePost = useDeletePost();

  const handleLike = async () => {
    if (!identity) { toast.error("Sign in to like posts"); return; }
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 400);
    try {
      await toggleLike.mutateAsync(post.id);
    } catch {
      toast.error("Failed to toggle like");
    }
  };

  const handleAddComment = async () => {
    if (!identity) { toast.error("Sign in to comment"); return; }
    if (!commentText.trim()) return;
    try {
      await addComment.mutateAsync({ postId: post.id, content: commentText });
      setCommentText("");
      toast.success("Comment added");
    } catch {
      toast.error("Failed to add comment");
    }
  };

  const handleDeletePost = async () => {
    try {
      await deletePost.mutateAsync(post.id);
      toast.success("Post deleted");
      onClose();
    } catch {
      toast.error("Failed to delete post");
    }
  };

  const likeCount = Number(post.likeCount);
  const commentCount = Number(post.commentCount);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-4xl max-h-[90vh] bg-card border border-border rounded-2xl overflow-hidden flex flex-col md:flex-row animate-slide-up shadow-2xl"
        role="document"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Image side */}
        <div className="md:w-[55%] bg-black flex items-center justify-center shrink-0">
          <PostImage
            imageBlobId={post.imageBlobId}
            aspectRatio="auto"
            className="w-full h-full max-h-[50vh] md:max-h-[90vh] object-contain"
          />
        </div>

        {/* Content side */}
        <div className="md:w-[45%] flex flex-col min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
            <button
              type="button"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              onClick={() => {
                void navigate({ to: "/profile/$principalId", params: { principalId: post.authorPrincipal.toText() } });
                onClose();
              }}
            >
              <UserAvatar
                displayName={authorProfile?.displayName ?? "?"}
                avatarBlobId={authorProfile?.avatarBlobId}
                size="sm"
              />
              <span className="font-semibold text-sm">{authorProfile?.displayName ?? "Unknown"}</span>
            </button>

            <div className="flex items-center gap-1">
              {isOwnPost && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover border-border">
                    <DropdownMenuItem
                      onClick={handleDeletePost}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete post
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Caption + Comments */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-4">
              {/* Caption */}
              {post.caption && (
                <div className="flex gap-3">
                  <UserAvatar
                    displayName={authorProfile?.displayName ?? "?"}
                    avatarBlobId={authorProfile?.avatarBlobId}
                    size="sm"
                  />
                  <div>
                    <span className="font-semibold text-sm mr-2">{authorProfile?.displayName ?? "Unknown"}</span>
                    <span className="text-sm text-foreground/90">{post.caption}</span>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatRelativeTime(post.timestamp)}
                    </div>
                  </div>
                </div>
              )}

              {/* Comments */}
              {commentsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-1 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <CommentItem
                      key={comment.id.toString()}
                      comment={comment}
                      currentPrincipal={currentPrincipal}
                      postId={post.id}
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Actions footer */}
          <div className="border-t border-border p-4 space-y-3 shrink-0">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleLike}
                className={cn(
                  "flex items-center gap-1.5 transition-colors",
                  likeAnimating && "animate-like",
                  hasLiked ? "text-red-500" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Heart
                  className="h-6 w-6 transition-transform"
                  fill={hasLiked ? "currentColor" : "none"}
                />
              </button>
              <button
                type="button"
                onClick={() => commentInputRef.current?.focus()}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="text-sm font-semibold">
              {likeCount > 0 && (
                <span>{likeCount.toLocaleString()} {likeCount === 1 ? "like" : "likes"}</span>
              )}
            </div>

            {/* Add comment */}
            <div className="flex gap-2 items-center">
              <Input
                ref={commentInputRef}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-transparent border-0 border-b border-border rounded-none px-0 text-sm focus-visible:ring-0 placeholder:text-muted-foreground"
                onKeyDown={(e) => { if (e.key === "Enter") handleAddComment(); }}
              />
              <button
                type="button"
                onClick={handleAddComment}
                disabled={!commentText.trim() || addComment.isPending}
                className="text-primary font-semibold text-sm disabled:opacity-40 hover:text-primary/80 transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>

            {commentCount > 0 && (
              <div className="text-xs text-muted-foreground">
                {commentCount} comment{commentCount !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
