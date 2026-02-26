import MixinStorage "blob-storage/Mixin";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Storage "blob-storage/Storage";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Principal "mo:core/Principal";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Int "mo:core/Int";

actor {
  include MixinStorage();

  // Data Types
  public type UserProfile = {
    displayName : Text;
    bio : Text;
    avatarBlobId : ?Text;
  };

  type Profile = {
    displayName : Text;
    bio : Text;
    avatarBlobId : ?Text;
  };

  module Profile {
    public func compare(p1 : Profile, p2 : Profile) : Order.Order {
      Text.compare(p1.displayName, p2.displayName);
    };
  };

  type Post = {
    id : Nat;
    authorPrincipal : Principal;
    caption : Text;
    imageBlobId : Text;
    timestamp : Time.Time;
    likeCount : Nat;
    commentCount : Nat;
  };

  module Post {
    public func compare(p1 : Post, p2 : Post) : Order.Order {
      if (p1.timestamp > p2.timestamp) {
        #less;
      } else if (p1.timestamp < p2.timestamp) {
        #greater;
      } else {
        #equal;
      };
    };
  };

  type Comment = {
    id : Nat;
    postId : Nat;
    authorPrincipal : Principal;
    content : Text;
    timestamp : Time.Time;
  };

  module Comment {
    public func compare(c1 : Comment, c2 : Comment) : Order.Order {
      Int.compare(c2.timestamp, c1.timestamp);
    };
  };

  type Message = {
    id : Nat;
    senderPrincipal : Principal;
    recipientPrincipal : Principal;
    content : Text;
    imageUrl : ?Text;
    timestamp : Time.Time;
    isRead : Bool;
  };

  type NotificationType = {
    #like;
    #comment;
    #follow;
    #dm;
  };

  type Notification = {
    id : Nat;
    _type : NotificationType;
    fromPrincipal : Principal;
    postId : ?Nat;
    message : Text;
    timestamp : Time.Time;
    isRead : Bool;
  };

  // Persistent Storage
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  var nextPostId = 1;
  var nextCommentId = 1;
  var nextMessageId = 1;
  var nextNotificationId = 1;

  // Data Structures
  let profiles = Map.empty<Principal, Profile>();
  let posts = Map.empty<Nat, Post>();
  let comments = Map.empty<Nat, Comment>();
  let followers = Map.empty<Principal, Set.Set<Principal>>();
  let followings = Map.empty<Principal, Set.Set<Principal>>();
  let postLikes = Map.empty<Nat, Set.Set<Principal>>();
  let userLikedPosts = Map.empty<Principal, Set.Set<Nat>>();
  let messages = Map.empty<Principal, Map.Map<Principal, List.List<Message>>>();
  let notifications = Map.empty<Principal, List.List<Notification>>();

  // Required Profile Functions for Frontend
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    switch (profiles.get(caller)) {
      case (null) { null };
      case (?profile) {
        ?{
          displayName = profile.displayName;
          bio = profile.bio;
          avatarBlobId = profile.avatarBlobId;
        };
      };
    };
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    let newProfile : Profile = {
      displayName = profile.displayName;
      bio = profile.bio;
      avatarBlobId = profile.avatarBlobId;
    };
    profiles.add(caller, newProfile);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    // Anyone can view profiles, but must be authenticated
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    switch (profiles.get(user)) {
      case (null) { null };
      case (?profile) {
        ?{
          displayName = profile.displayName;
          bio = profile.bio;
          avatarBlobId = profile.avatarBlobId;
        };
      };
    };
  };

  // Profile Functions
  public shared ({ caller }) func createOrUpdateProfile(displayName : Text, bio : Text, avatarBlobId : ?Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create or update profiles");
    };
    let profile : Profile = {
      displayName;
      bio;
      avatarBlobId;
    };
    profiles.add(caller, profile);
  };

  public query ({ caller }) func getProfile(principal : Principal) : async ?Profile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    profiles.get(principal);
  };

  public query ({ caller }) func getProfiles(principals : [Principal]) : async [Profile] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };

    let result = List.empty<Profile>();

    for (principal in principals.values()) {
      switch (profiles.get(principal)) {
        case (null) {};
        case (?profile) {
          result.add(profile);
        };
      };
    };

    result.toArray();
  };

  public query ({ caller }) func searchProfiles(searchText : Text) : async [Profile] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can search profiles");
    };

    let resultList = List.empty<Profile>();
    for (profile in profiles.values()) {
      if (profile.displayName.contains(#text searchText)) {
        resultList.add(profile);
      };
    };

    resultList.toArray();
  };

  // Follow System
  public shared ({ caller }) func followUser(userToFollow : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can follow others");
    };
    if (userToFollow == caller) { Runtime.trap("Cannot follow yourself") };

    let followersSet = switch (followers.get(userToFollow)) {
      case (null) { Set.empty<Principal>() };
      case (?set) { set };
    };
    let followingsSet = switch (followings.get(caller)) {
      case (null) { Set.empty<Principal>() };
      case (?set) { set };
    };
    if (followersSet.contains(caller)) { Runtime.trap("Already following") };

    followersSet.add(caller);
    followingsSet.add(userToFollow);
    followers.add(userToFollow, followersSet);
    followings.add(caller, followingsSet);

    let notification : Notification = {
      id = nextNotificationId;
      _type = #follow;
      fromPrincipal = caller;
      postId = null;
      message = "New follower";
      timestamp = Time.now();
      isRead = false;
    };
    addNotification(userToFollow, notification);
    nextNotificationId += 1;
  };

  public shared ({ caller }) func unfollowUser(userToUnfollow : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unfollow others");
    };

    let followersSet = switch (followers.get(userToUnfollow)) {
      case (null) { Runtime.trap("Not following this user") };
      case (?set) { set };
    };
    if (not followersSet.contains(caller)) {
      Runtime.trap("Not following this user");
    };
    let followingsSet = switch (followings.get(caller)) {
      case (null) { Set.empty<Principal>() };
      case (?set) { set };
    };
    followersSet.remove(caller);
    followingsSet.remove(userToUnfollow);
    followers.add(userToUnfollow, followersSet);
    followings.add(caller, followingsSet);
  };

  public query ({ caller }) func getFollowers(user : Principal) : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view followers");
    };
    switch (followers.get(user)) {
      case (null) { [] };
      case (?followersSet) { followersSet.toArray() };
    };
  };

  public query ({ caller }) func getFollowing(user : Principal) : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view following");
    };
    switch (followings.get(user)) {
      case (null) { [] };
      case (?followingsSet) { followingsSet.toArray() };
    };
  };

  public query ({ caller }) func isFollowing(user : Principal) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check following status");
    };
    switch (followers.get(user)) {
      case (null) { false };
      case (?followersSet) {
        followersSet.contains(caller);
      };
    };
  };

  // Post Functions
  public shared ({ caller }) func createPost(caption : Text, imageBlobId : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create posts");
    };
    let post : Post = {
      id = nextPostId;
      authorPrincipal = caller;
      caption;
      imageBlobId;
      timestamp = Time.now();
      likeCount = 0;
      commentCount = 0;
    };
    posts.add(nextPostId, post);
    nextPostId += 1;
    post.id;
  };

  public shared ({ caller }) func deletePost(postId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete posts");
    };
    switch (posts.get(postId)) {
      case (null) { Runtime.trap("Post not found") };
      case (?post) {
        if (post.authorPrincipal != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Cannot delete someone else's post");
        };
        posts.remove(postId);
      };
    };
  };

  public query ({ caller }) func getPost(postId : Nat) : async ?Post {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view posts");
    };
    posts.get(postId);
  };

  public query ({ caller }) func getFeedPosts(page : Nat, pageSize : Nat) : async [Post] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view feed");
    };
    let followingArray = switch (followings.get(caller)) {
      case (null) { [] };
      case (?followingsSet) { followingsSet.toArray() };
    };

    let filteredResult = List.empty<Post>();
    for (post in posts.values().toArray().values()) {
      for (author in followingArray.values()) {
        if (post.authorPrincipal == author) {
          filteredResult.add(post);
        };
      };
    };

    let sortedPosts = filteredResult.toArray().sort();
    let start = page * pageSize;
    let end = Nat.min(start + pageSize, sortedPosts.size());
    if (start >= sortedPosts.size()) {
      return [];
    };
    Array.tabulate<Post>(end - start, func(i) { sortedPosts[start + i] });
  };

  public query ({ caller }) func getExplorePosts(page : Nat, pageSize : Nat) : async [Post] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can explore posts");
    };
    let allPosts = posts.values().toArray().sort();
    let start = page * pageSize;
    let end = Nat.min(start + pageSize, allPosts.size());
    if (start >= allPosts.size()) {
      return [];
    };
    Array.tabulate<Post>(end - start, func(i) { allPosts[start + i] });
  };

  public query ({ caller }) func getUserPosts(user : Principal, page : Nat, pageSize : Nat) : async [Post] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view user posts");
    };
    let filteredResult = List.empty<Post>();
    for (post in posts.values().toArray().values()) {
      if (post.authorPrincipal == user) {
        filteredResult.add(post);
      };
    };

    let sortedPosts = filteredResult.toArray().sort();
    let start = page * pageSize;
    let end = Nat.min(start + pageSize, sortedPosts.size());
    if (start >= sortedPosts.size()) {
      return [];
    };
    Array.tabulate<Post>(end - start, func(i) { sortedPosts[start + i] });
  };

  // Like Functions
  public shared ({ caller }) func toggleLike(postId : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can like posts");
    };
    switch (posts.get(postId)) {
      case (null) { Runtime.trap("Post not found") };
      case (?post) {
        let likesSet = switch (postLikes.get(postId)) {
          case (null) { Set.empty<Principal>() };
          case (?set) { set };
        };
        let userLikesSet = switch (userLikedPosts.get(caller)) {
          case (null) { Set.empty<Nat>() };
          case (?set) { set };
        };
        let hasLiked = likesSet.contains(caller);
        if (hasLiked) {
          likesSet.remove(caller);
          userLikesSet.remove(postId);
        } else {
          likesSet.add(caller);
          userLikesSet.add(postId);
          if (post.authorPrincipal != caller) {
            let notification : Notification = {
              id = nextNotificationId;
              _type = #like;
              fromPrincipal = caller;
              postId = ?postId;
              message = "New like on your post";
              timestamp = Time.now();
              isRead = false;
            };
            addNotification(post.authorPrincipal, notification);
            nextNotificationId += 1;
          };
        };
        postLikes.add(postId, likesSet);
        userLikedPosts.add(caller, userLikesSet);
        not hasLiked;
      };
    };
  };

  public query ({ caller }) func getLikeCount(postId : Nat) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view like counts");
    };
    switch (postLikes.get(postId)) {
      case (null) { 0 };
      case (?likesSet) { likesSet.size() };
    };
  };

  public query ({ caller }) func hasLiked(postId : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check like status");
    };
    switch (postLikes.get(postId)) {
      case (null) { false };
      case (?likesSet) { likesSet.contains(caller) };
    };
  };

  public query ({ caller }) func getLikedPosts() : async [Nat] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view liked posts");
    };
    switch (userLikedPosts.get(caller)) {
      case (null) { [] };
      case (?userLikesSet) { userLikesSet.toArray() };
    };
  };

  // Comment Functions
  public shared ({ caller }) func addComment(postId : Nat, content : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add comments");
    };
    switch (posts.get(postId)) {
      case (null) { Runtime.trap("Post not found") };
      case (?post) {
        let comment : Comment = {
          id = nextCommentId;
          postId;
          authorPrincipal = caller;
          content;
          timestamp = Time.now();
        };
        comments.add(nextCommentId, comment);
        nextCommentId += 1;

        if (post.authorPrincipal != caller) {
          let notification : Notification = {
            id = nextNotificationId;
            _type = #comment;
            fromPrincipal = caller;
            postId = ?postId;
            message = "New comment on your post";
            timestamp = Time.now();
            isRead = false;
          };
          addNotification(post.authorPrincipal, notification);
          nextNotificationId += 1;
        };
        comment.id;
      };
    };
  };

  public shared ({ caller }) func deleteComment(commentId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete comments");
    };
    switch (comments.get(commentId)) {
      case (null) { Runtime.trap("Comment not found") };
      case (?comment) {
        if (comment.authorPrincipal != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Cannot delete someone else's comment");
        };
        comments.remove(commentId);
      };
    };
  };

  public query ({ caller }) func getComments(postId : Nat, page : Nat, pageSize : Nat) : async [Comment] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view comments");
    };

    let resultList = List.empty<Comment>();
    for (comment in comments.values()) {
      if (comment.postId == postId) {
        resultList.add(comment);
      };
    };

    let sortedComments = resultList.toArray().sort();

    let start = page * pageSize;
    let end = Nat.min(start + pageSize, sortedComments.size());
    if (start >= sortedComments.size()) {
      return [];
    };
    Array.tabulate<Comment>(end - start, func(i) { sortedComments[start + i] });
  };

  // Direct Messages
  public shared ({ caller }) func sendMessage(recipient : Principal, content : Text, imageUrl : ?Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send messages");
    };
    if (caller == recipient) {
      Runtime.trap("Cannot send message to yourself");
    };

    let message : Message = {
      id = nextMessageId;
      senderPrincipal = caller;
      recipientPrincipal = recipient;
      content;
      imageUrl;
      timestamp = Time.now();
      isRead = false;
    };

    // Store message for sender
    let senderRecipientMap = switch (messages.get(caller)) {
      case (null) {
        let newMap = Map.empty<Principal, List.List<Message>>();
        messages.add(caller, newMap);
        newMap;
      };
      case (?map) { map };
    };

    let senderMessagesList = switch (senderRecipientMap.get(recipient)) {
      case (null) { List.singleton<Message>(message) };
      case (?list) {
        let newList = List.empty<Message>();
        for (msg in list.values()) { newList.add(msg) };
        newList.add(message);
        newList;
      };
    };
    senderRecipientMap.add(recipient, senderMessagesList);

    // Store message for recipient
    let recipientSenderMap = switch (messages.get(recipient)) {
      case (null) {
        let newMap = Map.empty<Principal, List.List<Message>>();
        messages.add(recipient, newMap);
        newMap;
      };
      case (?map) { map };
    };

    let recipientMessagesList = switch (recipientSenderMap.get(caller)) {
      case (null) { List.singleton<Message>(message) };
      case (?list) {
        let newList = List.empty<Message>();
        for (msg in list.values()) { newList.add(msg) };
        newList.add(message);
        newList;
      };
    };
    recipientSenderMap.add(caller, recipientMessagesList);

    let notification : Notification = {
      id = nextNotificationId;
      _type = #dm;
      fromPrincipal = caller;
      postId = null;
      message = "New direct message";
      timestamp = Time.now();
      isRead = false;
    };
    addNotification(recipient, notification);
    nextNotificationId += 1;

    let messageId = nextMessageId;
    nextMessageId += 1;
    messageId;
  };

  public query ({ caller }) func getMessages(conversationPartner : Principal, page : Nat, pageSize : Nat) : async [Message] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view messages");
    };
    switch (messages.get(caller)) {
      case (null) { [] };
      case (?recipientMap) {
        switch (recipientMap.get(conversationPartner)) {
          case (null) { [] };
          case (?messagesList) {
            let messagesArray = messagesList.toArray();
            let start = page * pageSize;
            let end = Nat.min(start + pageSize, messagesArray.size());
            if (start >= messagesArray.size()) {
              return [];
            };
            Array.tabulate<Message>(end - start, func(i) { messagesArray[start + i] });
          };
        };
      };
    };
  };

  public shared ({ caller }) func markConversationRead(conversationPartner : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark conversations as read");
    };
    switch (messages.get(caller)) {
      case (null) { Runtime.trap("No messages found") };
      case (?recipientMap) {
        switch (recipientMap.get(conversationPartner)) {
          case (null) { Runtime.trap("No conversation found") };
          case (?messagesList) {
            let updatedList = messagesList.map<Message, Message>(
              func(msg) {
                if (msg.recipientPrincipal == caller and msg.senderPrincipal == conversationPartner) {
                  {
                    id = msg.id;
                    senderPrincipal = msg.senderPrincipal;
                    recipientPrincipal = msg.recipientPrincipal;
                    content = msg.content;
                    imageUrl = msg.imageUrl;
                    timestamp = msg.timestamp;
                    isRead = true;
                  };
                } else {
                  msg;
                };
              }
            );
            recipientMap.add(conversationPartner, updatedList);
          };
        };
      };
    };
  };

  // Notification Functions
  private func addNotification(user : Principal, notification : Notification) : () {
    let notificationsList = switch (notifications.get(user)) {
      case (null) { List.singleton<Notification>(notification) };
      case (?list) {
        let newList = List.empty<Notification>();
        for (item in list.values()) { newList.add(item) };
        newList.add(notification);
        newList;
      };
    };
    notifications.add(user, notificationsList);
  };

  public query ({ caller }) func getNotifications(page : Nat, pageSize : Nat) : async [Notification] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view notifications");
    };
    let notificationsList = switch (notifications.get(caller)) {
      case (null) { List.empty<Notification>() };
      case (?list) { list };
    };

    let notificationsArray = notificationsList.toArray();
    let start = page * pageSize;
    let end = Nat.min(start + pageSize, notificationsArray.size());
    if (start >= notificationsArray.size()) {
      return [];
    };
    Array.tabulate<Notification>(end - start, func(i) { notificationsArray[start + i] });
  };

  public shared ({ caller }) func markNotificationRead(notificationId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark notifications as read");
    };
    switch (notifications.get(caller)) {
      case (null) { Runtime.trap("No notifications found") };
      case (?notificationsList) {
        let updatedList = notificationsList.map<Notification, Notification>(
          func(notification) {
            if (notification.id == notificationId) {
              {
                id = notification.id;
                _type = notification._type;
                fromPrincipal = notification.fromPrincipal;
                postId = notification.postId;
                message = notification.message;
                timestamp = notification.timestamp;
                isRead = true;
              };
            } else {
              notification;
            };
          }
        );
        notifications.add(caller, updatedList);
      };
    };
  };

  public shared ({ caller }) func markAllNotificationsRead() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark notifications as read");
    };
    switch (notifications.get(caller)) {
      case (null) { Runtime.trap("No notifications found") };
      case (?notificationsList) {
        let updatedList = notificationsList.map<Notification, Notification>(
          func(notification) {
            {
              id = notification.id;
              _type = notification._type;
              fromPrincipal = notification.fromPrincipal;
              postId = notification.postId;
              message = notification.message;
              timestamp = notification.timestamp;
              isRead = true;
            };
          }
        );
        notifications.add(caller, updatedList);
      };
    };
  };

  public query ({ caller }) func getUnreadNotificationCount() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view notification count");
    };
    switch (notifications.get(caller)) {
      case (null) { 0 };
      case (?notificationsList) {
        var count = 0;
        for (notification in notificationsList.values()) {
          if (not notification.isRead) { count += 1 };
        };
        count;
      };
    };
  };
};
