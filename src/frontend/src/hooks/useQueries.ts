import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";
import type { UserProfile, Post, Comment, Notification, Message, Profile } from "../backend.d";
import { Principal } from "@icp-sdk/core/principal";

// ─── Profile Queries ────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      await actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function useGetProfile(principal: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Profile | null>({
    queryKey: ["profile", principal?.toText()],
    queryFn: async () => {
      if (!actor || !principal) return null;
      return actor.getProfile(principal);
    },
    enabled: !!actor && !actorFetching && !!principal,
  });
}

export function useGetUserProfile(principal: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserProfile | null>({
    queryKey: ["userProfile", principal?.toText()],
    queryFn: async () => {
      if (!actor || !principal) return null;
      return actor.getUserProfile(principal);
    },
    enabled: !!actor && !actorFetching && !!principal,
  });
}

export function useSearchProfiles(searchText: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Profile[]>({
    queryKey: ["searchProfiles", searchText],
    queryFn: async () => {
      if (!actor || !searchText.trim()) return [];
      return actor.searchProfiles(searchText);
    },
    enabled: !!actor && !actorFetching && searchText.trim().length > 0,
  });
}

// ─── Post Queries ────────────────────────────────────────────────────────────

export function useGetFeedPosts(page = 0, pageSize = 20) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Post[]>({
    queryKey: ["feedPosts", page, pageSize],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getFeedPosts(BigInt(page), BigInt(pageSize));
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetExplorePosts(page = 0, pageSize = 30) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Post[]>({
    queryKey: ["explorePosts", page, pageSize],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getExplorePosts(BigInt(page), BigInt(pageSize));
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetUserPosts(principal: Principal | null, page = 0, pageSize = 30) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Post[]>({
    queryKey: ["userPosts", principal?.toText(), page, pageSize],
    queryFn: async () => {
      if (!actor || !principal) return [];
      return actor.getUserPosts(principal, BigInt(page), BigInt(pageSize));
    },
    enabled: !!actor && !actorFetching && !!principal,
  });
}

export function useGetPost(postId: bigint | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Post | null>({
    queryKey: ["post", postId?.toString()],
    queryFn: async () => {
      if (!actor || postId === null) return null;
      return actor.getPost(postId);
    },
    enabled: !!actor && !actorFetching && postId !== null,
  });
}

export function useCreatePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ caption, imageBlobId }: { caption: string; imageBlobId: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createPost(caption, imageBlobId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedPosts"] });
      queryClient.invalidateQueries({ queryKey: ["explorePosts"] });
      queryClient.invalidateQueries({ queryKey: ["userPosts"] });
    },
  });
}

export function useDeletePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      await actor.deletePost(postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedPosts"] });
      queryClient.invalidateQueries({ queryKey: ["explorePosts"] });
      queryClient.invalidateQueries({ queryKey: ["userPosts"] });
    },
  });
}

// ─── Like Queries ────────────────────────────────────────────────────────────

export function useHasLiked(postId: bigint | null) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<boolean>({
    queryKey: ["hasLiked", postId?.toString()],
    queryFn: async () => {
      if (!actor || postId === null) return false;
      return actor.hasLiked(postId);
    },
    enabled: !!actor && !actorFetching && postId !== null && !!identity,
  });
}

export function useGetLikedPosts() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<bigint[]>({
    queryKey: ["likedPosts"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getLikedPosts();
    },
    enabled: !!actor && !actorFetching && !!identity,
  });
}

export function useToggleLike() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.toggleLike(postId);
    },
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: ["hasLiked", postId.toString()] });
      queryClient.invalidateQueries({ queryKey: ["post", postId.toString()] });
      queryClient.invalidateQueries({ queryKey: ["likedPosts"] });
      queryClient.invalidateQueries({ queryKey: ["feedPosts"] });
      queryClient.invalidateQueries({ queryKey: ["explorePosts"] });
    },
  });
}

// ─── Comment Queries ─────────────────────────────────────────────────────────

export function useGetComments(postId: bigint | null, page = 0, pageSize = 20) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Comment[]>({
    queryKey: ["comments", postId?.toString(), page],
    queryFn: async () => {
      if (!actor || postId === null) return [];
      return actor.getComments(postId, BigInt(page), BigInt(pageSize));
    },
    enabled: !!actor && !actorFetching && postId !== null,
  });
}

export function useAddComment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, content }: { postId: bigint; content: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addComment(postId, content);
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId.toString()] });
      queryClient.invalidateQueries({ queryKey: ["post", postId.toString()] });
    },
  });
}

export function useDeleteComment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, postId }: { commentId: bigint; postId: bigint }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.deleteComment(commentId);
      return postId;
    },
    onSuccess: (postId) => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId.toString()] });
    },
  });
}

// ─── Follow Queries ──────────────────────────────────────────────────────────

export function useIsFollowing(principal: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<boolean>({
    queryKey: ["isFollowing", principal?.toText()],
    queryFn: async () => {
      if (!actor || !principal) return false;
      return actor.isFollowing(principal);
    },
    enabled: !!actor && !actorFetching && !!principal && !!identity,
  });
}

export function useGetFollowers(principal: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Principal[]>({
    queryKey: ["followers", principal?.toText()],
    queryFn: async () => {
      if (!actor || !principal) return [];
      return actor.getFollowers(principal);
    },
    enabled: !!actor && !actorFetching && !!principal,
  });
}

export function useGetFollowing(principal: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Principal[]>({
    queryKey: ["following", principal?.toText()],
    queryFn: async () => {
      if (!actor || !principal) return [];
      return actor.getFollowing(principal);
    },
    enabled: !!actor && !actorFetching && !!principal,
  });
}

export function useFollowUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (principal: Principal) => {
      if (!actor) throw new Error("Actor not available");
      await actor.followUser(principal);
    },
    onSuccess: (_, principal) => {
      queryClient.invalidateQueries({ queryKey: ["isFollowing", principal.toText()] });
      queryClient.invalidateQueries({ queryKey: ["followers", principal.toText()] });
      queryClient.invalidateQueries({ queryKey: ["following"] });
    },
  });
}

export function useUnfollowUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (principal: Principal) => {
      if (!actor) throw new Error("Actor not available");
      await actor.unfollowUser(principal);
    },
    onSuccess: (_, principal) => {
      queryClient.invalidateQueries({ queryKey: ["isFollowing", principal.toText()] });
      queryClient.invalidateQueries({ queryKey: ["followers", principal.toText()] });
      queryClient.invalidateQueries({ queryKey: ["following"] });
    },
  });
}

// ─── Notification Queries ────────────────────────────────────────────────────

export function useGetNotifications(page = 0, pageSize = 30) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<Notification[]>({
    queryKey: ["notifications", page],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getNotifications(BigInt(page), BigInt(pageSize));
    },
    enabled: !!actor && !actorFetching && !!identity,
  });
}

export function useGetUnreadNotificationCount() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<bigint>({
    queryKey: ["unreadNotificationCount"],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getUnreadNotificationCount();
    },
    enabled: !!actor && !actorFetching && !!identity,
    refetchInterval: 30000,
  });
}

export function useMarkAllNotificationsRead() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      await actor.markAllNotificationsRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unreadNotificationCount"] });
    },
  });
}

// ─── Message Queries ─────────────────────────────────────────────────────────

export function useGetMessages(partner: Principal | null, page = 0, pageSize = 50) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<Message[]>({
    queryKey: ["messages", partner?.toText(), page],
    queryFn: async () => {
      if (!actor || !partner) return [];
      return actor.getMessages(partner, BigInt(page), BigInt(pageSize));
    },
    enabled: !!actor && !actorFetching && !!partner && !!identity,
    refetchInterval: 5000,
  });
}

export function useSendMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recipient,
      content,
      imageUrl,
    }: {
      recipient: Principal;
      content: string;
      imageUrl: string | null;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.sendMessage(recipient, content, imageUrl);
    },
    onSuccess: (_, { recipient }) => {
      queryClient.invalidateQueries({ queryKey: ["messages", recipient.toText()] });
    },
  });
}

export function useMarkConversationRead() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (partner: Principal) => {
      if (!actor) throw new Error("Actor not available");
      await actor.markConversationRead(partner);
    },
    onSuccess: (_, partner) => {
      queryClient.invalidateQueries({ queryKey: ["messages", partner.toText()] });
    },
  });
}

export function useGetProfiles(principals: Principal[]) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Profile[]>({
    queryKey: ["profiles", principals.map((p) => p.toText()).join(",")],
    queryFn: async () => {
      if (!actor || principals.length === 0) return [];
      return actor.getProfiles(principals);
    },
    enabled: !!actor && !actorFetching && principals.length > 0,
  });
}
