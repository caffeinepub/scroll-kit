# Scroll Kit

## Current State
The project was bootstrapped but the previous build failed before generating any backend Motoko code or frontend app code. Only the base scaffolding exists (shadcn UI components, main.tsx shell). There is no backend canister, no app pages, and no data layer.

## Requested Changes (Diff)

### Add
- Full social media platform ("Scroll Kit") with dark theme and blue accent color
- User authentication via Internet Identity
- User profiles: display name, bio, avatar (text initials fallback), follower/following counts
- Follow / unfollow other users
- Photo feed: upload photos with captions, display posts from followed users in chronological order
- Likes on posts (toggle like/unlike)
- Comments on posts (add and view comments)
- Explore section: discover posts from all users, not just followed
- Direct messaging: send text messages and share photo URLs between users
- Notifications: likes, comments, follows, DM alerts

### Modify
- Nothing (fresh build)

### Remove
- Nothing

## Implementation Plan
1. Select `authorization` and `blob-storage` components for auth and photo storage
2. Generate backend Motoko canister with:
   - User profile management (create/update profile, get profile by principal)
   - Follow/unfollow system with follower/following lists
   - Posts: create post (text caption + photo blob reference), list feed (followed users), list explore (all posts)
   - Likes: toggle like, get like count and whether caller liked
   - Comments: add comment, list comments per post
   - Direct messages: send message (text or photo URL), list conversations, list messages in conversation
   - Notifications: list notifications for caller
3. Build frontend with:
   - Dark theme (#0a0a0a background, blue accent #3b82f6)
   - Auth gate: login page with Internet Identity button
   - Bottom navigation: Home (feed), Explore, Create post, DMs, Profile
   - Home feed page
   - Explore page (grid of all posts)
   - Create post modal/page (upload photo, add caption)
   - Post detail: full image, likes, comments
   - Profile page (own and others): avatar, bio, posts grid, follow button
   - DM inbox and conversation view
   - Notification bell/page

## UX Notes
- Dark theme: background #0a0a0a, cards #111111/#1a1a1a, blue accent #3b82f6
- Mobile-first layout (max-width 480px centered, desktop fills remaining space with sidebar nav)
- Smooth hover/tap states on all interactive elements
- Skeleton loaders while data loads
- Toast notifications for actions (liked, followed, message sent)
