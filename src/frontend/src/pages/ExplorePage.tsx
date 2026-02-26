import { useState, useCallback } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetExplorePosts, useSearchProfiles } from "../hooks/useQueries";
import { PostDetail } from "../components/PostDetail";
import { PostImage } from "../components/PostImage";
import type { Post } from "../backend.d";
import { cn } from "@/lib/utils";
import { useDebounce } from "../hooks/useDebounce";

interface PostGridItemProps {
  post: Post;
  onClick: (post: Post) => void;
}

function PostGridItem({ post, onClick }: PostGridItemProps) {
  return (
    <button
      type="button"
      className="aspect-square overflow-hidden cursor-pointer group relative"
      onClick={() => onClick(post)}
    >
      <PostImage
        imageBlobId={post.imageBlobId}
        aspectRatio="square"
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
        <div className="flex items-center gap-4 text-white font-semibold text-sm">
          <span>♥ {Number(post.likeCount)}</span>
          <span>💬 {Number(post.commentCount)}</span>
        </div>
      </div>
    </button>
  );
}

export function ExplorePage() {
  const [searchText, setSearchText] = useState("");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const debouncedSearch = useDebounce(searchText, 300);

  const { data: posts = [], isLoading: postsLoading } = useGetExplorePosts();
  const { data: searchResults = [], isFetching: searchLoading } = useSearchProfiles(debouncedSearch);

  const handleClearSearch = useCallback(() => setSearchText(""), []);

  return (
    <main className="py-6 px-4">
      <header className="mb-6">
        <h1 className="font-mono-display font-bold text-xl mb-4 md:hidden">
          scroll<span className="text-primary">kit</span>
        </h1>

        {/* Search bar */}
        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search users..."
            className="pl-9 pr-9 bg-muted/30 border-border focus-visible:ring-primary/50 rounded-xl"
          />
          {searchText && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Search dropdown */}
          {debouncedSearch && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-xl shadow-xl z-30 overflow-hidden animate-slide-up">
              {searchLoading ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No users found for "{debouncedSearch}"
                </div>
              ) : (
                <div className="py-1 max-h-64 overflow-y-auto">
                  {searchResults.map((profile) => (
                    <div
                      key={profile.displayName}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors"
                    >
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: "#2563eb" }}
                      >
                        {profile.displayName[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{profile.displayName}</div>
                        {profile.bio && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {profile.bio}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Post grid */}
      {postsLoading ? (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-0.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground text-sm">No posts to explore yet.</p>
          <p className="text-muted-foreground text-xs mt-1">Be the first to share something!</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-0.5 rounded-xl overflow-hidden">
          {posts.map((post) => (
            <PostGridItem
              key={post.id.toString()}
              post={post}
              onClick={setSelectedPost}
            />
          ))}
        </div>
      )}

      {selectedPost && (
        <PostDetail post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </main>
  );
}
