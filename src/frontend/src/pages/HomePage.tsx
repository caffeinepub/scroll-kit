import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetFeedPosts } from "../hooks/useQueries";
import { PostCard } from "../components/PostCard";
import { Compass } from "lucide-react";

function FeedSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="aspect-square w-full" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HomePage() {
  const { data: posts = [], isLoading } = useGetFeedPosts();

  return (
    <main className="max-w-[468px] mx-auto py-6 px-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-6 md:hidden">
        <h1 className="font-mono-display font-bold text-xl tracking-tight">
          scroll<span className="text-primary">kit</span>
        </h1>
      </header>

      {isLoading ? (
        <FeedSkeleton />
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
          <div className="h-16 w-16 rounded-2xl bg-muted/40 flex items-center justify-center mb-4">
            <Compass className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="font-semibold text-lg mb-2">Your feed is empty</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-[280px]">
            Follow some users to see their posts here.
          </p>
          <Link
            to="/explore"
            className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-semibold text-sm px-6 py-2.5 rounded-full"
          >
            Explore posts
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard key={post.id.toString()} post={post} />
          ))}
        </div>
      )}
    </main>
  );
}
