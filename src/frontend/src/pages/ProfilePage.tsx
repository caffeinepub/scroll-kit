import { useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { Loader2, Grid3X3, UserCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Principal } from "@icp-sdk/core/principal";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetCallerUserProfile,
  useGetUserProfile,
  useGetUserPosts,
  useGetFollowers,
  useGetFollowing,
  useIsFollowing,
  useFollowUser,
  useUnfollowUser,
  useSaveCallerUserProfile,
} from "../hooks/useQueries";
import { UserAvatar } from "../components/UserAvatar";
import { PostImage } from "../components/PostImage";
import { PostDetail } from "../components/PostDetail";
import type { Post, UserProfile } from "../backend.d";
import { useBlobStorage } from "../hooks/useBlobStorage";

function EditProfileModal({
  currentProfile,
  onClose,
}: {
  currentProfile: UserProfile;
  onClose: () => void;
}) {
  const [displayName, setDisplayName] = useState(currentProfile.displayName);
  const [bio, setBio] = useState(currentProfile.bio);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const { upload } = useBlobStorage();
  const saveProfile = useSaveCallerUserProfile();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!displayName.trim()) { toast.error("Display name is required"); return; }
    try {
      let avatarBlobId = currentProfile.avatarBlobId;
      if (avatarFile) {
        avatarBlobId = await upload(avatarFile);
      }
      await saveProfile.mutateAsync({
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarBlobId,
      });
      toast.success("Profile updated!");
      onClose();
    } catch {
      toast.error("Failed to update profile");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono-display text-sm uppercase tracking-wide text-muted-foreground">
            Edit Profile
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <UserAvatar
                  displayName={displayName}
                  avatarBlobId={currentProfile.avatarBlobId}
                  size="lg"
                />
              )}
            </div>
            <label className="cursor-pointer">
              <span className="text-sm text-primary font-medium hover:text-primary/80 transition-colors">
                Change photo
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </label>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Display Name</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="bg-muted/30 border-border focus-visible:ring-primary/50"
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Bio</Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell something about yourself..."
              className="bg-muted/30 border-border resize-none focus-visible:ring-primary/50"
              rows={3}
              maxLength={150}
            />
            <span className="text-xs text-muted-foreground">{bio.length}/150</span>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saveProfile.isPending || !displayName.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {saveProfile.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ProfilePage() {
  const location = useLocation();
  // Extract principalId from path: /profile/:principalId
  const pathParts = location.pathname.split("/");
  const principalId = pathParts.length >= 3 && pathParts[1] === "profile" ? pathParts[2] : undefined;
  const { identity } = useInternetIdentity();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const currentPrincipal = identity?.getPrincipal().toText();
  const isOwnProfile = !principalId || principalId === currentPrincipal;

  const targetPrincipal = isOwnProfile
    ? (identity ? identity.getPrincipal() : null)
    : (() => {
        try {
          return Principal.fromText(principalId);
        } catch {
          return null;
        }
      })();

  const { data: ownProfile, isLoading: ownProfileLoading } = useGetCallerUserProfile();
  const { data: otherProfile, isLoading: otherProfileLoading } = useGetUserProfile(
    isOwnProfile ? null : targetPrincipal
  );

  const displayProfile = isOwnProfile ? ownProfile : otherProfile;
  const profileLoading = isOwnProfile ? ownProfileLoading : otherProfileLoading;

  const { data: posts = [], isLoading: postsLoading } = useGetUserPosts(targetPrincipal);
  const { data: followers = [] } = useGetFollowers(targetPrincipal);
  const { data: following = [] } = useGetFollowing(targetPrincipal);
  const { data: isFollowing = false } = useIsFollowing(
    isOwnProfile ? null : targetPrincipal
  );

  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();

  const handleFollowToggle = async () => {
    if (!targetPrincipal) return;
    try {
      if (isFollowing) {
        await unfollowUser.mutateAsync(targetPrincipal);
        toast.success("Unfollowed");
      } else {
        await followUser.mutateAsync(targetPrincipal);
        toast.success("Following!");
      }
    } catch {
      toast.error("Failed to update follow status");
    }
  };

  if (profileLoading) {
    return (
      <main className="max-w-3xl mx-auto py-8 px-4">
        <div className="flex gap-8 mb-8">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="space-y-3 flex-1">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-0.5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto py-6 px-4">
      {/* Profile header */}
      <section className="flex flex-col sm:flex-row gap-6 mb-8 animate-fade-in">
        <div className="shrink-0">
          <UserAvatar
            displayName={displayProfile?.displayName ?? "?"}
            avatarBlobId={displayProfile?.avatarBlobId}
            size="xl"
          />
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="font-semibold text-xl">
              {displayProfile?.displayName ?? "Unknown User"}
            </h1>
            {isOwnProfile ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditModal(true)}
                className="border-border text-sm font-medium hover:bg-accent"
              >
                Edit profile
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleFollowToggle}
                disabled={followUser.isPending || unfollowUser.isPending}
                className={
                  isFollowing
                    ? "border border-border bg-transparent text-foreground hover:bg-accent hover:text-destructive text-sm font-medium"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium"
                }
              >
                {followUser.isPending || unfollowUser.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isFollowing ? (
                  <><UserCheck className="h-4 w-4 mr-1.5" />Following</>
                ) : (
                  <><UserPlus className="h-4 w-4 mr-1.5" />Follow</>
                )}
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-6 text-sm">
            <span>
              <strong className="font-semibold">{posts.length}</strong>{" "}
              <span className="text-muted-foreground">posts</span>
            </span>
            <span>
              <strong className="font-semibold">{followers.length}</strong>{" "}
              <span className="text-muted-foreground">followers</span>
            </span>
            <span>
              <strong className="font-semibold">{following.length}</strong>{" "}
              <span className="text-muted-foreground">following</span>
            </span>
          </div>

          {displayProfile?.bio && (
            <p className="text-sm text-foreground/90 whitespace-pre-line">
              {displayProfile.bio}
            </p>
          )}
        </div>
      </section>

      {/* Divider */}
      <div className="flex items-center justify-center border-t border-border py-3 mb-4">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          <Grid3X3 className="h-3 w-3" />
          Posts
        </div>
      </div>

      {/* Posts grid */}
      {postsLoading ? (
        <div className="grid grid-cols-3 gap-0.5 rounded-xl overflow-hidden">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-14 w-14 rounded-2xl bg-muted/40 flex items-center justify-center mb-4">
            <Grid3X3 className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">
            {isOwnProfile ? "Share your first photo" : "No posts yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 rounded-xl overflow-hidden">
          {posts.map((post) => (
            <button
              key={post.id.toString()}
              type="button"
              className="aspect-square overflow-hidden group relative"
              onClick={() => setSelectedPost(post)}
            >
              <PostImage
                imageBlobId={post.imageBlobId}
                aspectRatio="square"
                className="w-full h-full group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <span className="text-white text-sm font-semibold">
                  ♥ {Number(post.likeCount)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedPost && (
        <PostDetail post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}

      {showEditModal && ownProfile && (
        <EditProfileModal
          currentProfile={ownProfile}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </main>
  );
}
