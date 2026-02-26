import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export interface Comment {
    id: bigint;
    content: string;
    timestamp: Time;
    authorPrincipal: Principal;
    postId: bigint;
}
export interface Post {
    id: bigint;
    likeCount: bigint;
    timestamp: Time;
    caption: string;
    commentCount: bigint;
    imageBlobId: string;
    authorPrincipal: Principal;
}
export interface Notification {
    id: bigint;
    _type: NotificationType;
    isRead: boolean;
    fromPrincipal: Principal;
    message: string;
    timestamp: Time;
    postId?: bigint;
}
export interface Message {
    id: bigint;
    content: string;
    isRead: boolean;
    imageUrl?: string;
    senderPrincipal: Principal;
    timestamp: Time;
    recipientPrincipal: Principal;
}
export interface Profile {
    bio: string;
    displayName: string;
    avatarBlobId?: string;
}
export interface UserProfile {
    bio: string;
    displayName: string;
    avatarBlobId?: string;
}
export enum NotificationType {
    dm = "dm",
    like = "like",
    comment = "comment",
    follow = "follow"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addComment(postId: bigint, content: string): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createOrUpdateProfile(displayName: string, bio: string, avatarBlobId: string | null): Promise<void>;
    createPost(caption: string, imageBlobId: string): Promise<bigint>;
    deleteComment(commentId: bigint): Promise<void>;
    deletePost(postId: bigint): Promise<void>;
    followUser(userToFollow: Principal): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getComments(postId: bigint, page: bigint, pageSize: bigint): Promise<Array<Comment>>;
    getExplorePosts(page: bigint, pageSize: bigint): Promise<Array<Post>>;
    getFeedPosts(page: bigint, pageSize: bigint): Promise<Array<Post>>;
    getFollowers(user: Principal): Promise<Array<Principal>>;
    getFollowing(user: Principal): Promise<Array<Principal>>;
    getLikeCount(postId: bigint): Promise<bigint>;
    getLikedPosts(): Promise<Array<bigint>>;
    getMessages(conversationPartner: Principal, page: bigint, pageSize: bigint): Promise<Array<Message>>;
    getNotifications(page: bigint, pageSize: bigint): Promise<Array<Notification>>;
    getPost(postId: bigint): Promise<Post | null>;
    getProfile(principal: Principal): Promise<Profile | null>;
    getProfiles(principals: Array<Principal>): Promise<Array<Profile>>;
    getUnreadNotificationCount(): Promise<bigint>;
    getUserPosts(user: Principal, page: bigint, pageSize: bigint): Promise<Array<Post>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    hasLiked(postId: bigint): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    isFollowing(user: Principal): Promise<boolean>;
    markAllNotificationsRead(): Promise<void>;
    markConversationRead(conversationPartner: Principal): Promise<void>;
    markNotificationRead(notificationId: bigint): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchProfiles(searchText: string): Promise<Array<Profile>>;
    sendMessage(recipient: Principal, content: string, imageUrl: string | null): Promise<bigint>;
    toggleLike(postId: bigint): Promise<boolean>;
    unfollowUser(userToUnfollow: Principal): Promise<void>;
}
