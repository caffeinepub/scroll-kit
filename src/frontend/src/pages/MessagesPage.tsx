import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Search, Send, ImagePlus, X, MessageSquare, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Principal } from "@icp-sdk/core/principal";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetMessages,
  useSendMessage,
  useSearchProfiles,
  useGetProfile,
  useMarkConversationRead,
} from "../hooks/useQueries";
import { UserAvatar } from "../components/UserAvatar";
import { formatRelativeTime } from "../utils/helpers";
import { useBlobStorage } from "../hooks/useBlobStorage";
import { useDebounce } from "../hooks/useDebounce";
import type { Message } from "../backend.d";

// Persist recent conversation partners in localStorage
const CONVERSATIONS_KEY = "scrollkit_conversations";

function getStoredConversations(): string[] {
  try {
    const stored = localStorage.getItem(CONVERSATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addConversation(principalText: string) {
  const existing = getStoredConversations();
  const updated = [principalText, ...existing.filter((p) => p !== principalText)].slice(0, 20);
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(updated));
}

interface ConversationPartnerProps {
  principalText: string;
  isActive: boolean;
  onClick: () => void;
}

function ConversationPartner({ principalText, isActive, onClick }: ConversationPartnerProps) {
  const principal = (() => {
    try { return Principal.fromText(principalText); } catch { return null; }
  })();
  const { data: profile } = useGetProfile(principal);

  return (
    <button
      type="button"
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left",
        isActive ? "bg-primary/15 text-foreground" : "hover:bg-accent/40 text-foreground"
      )}
      onClick={onClick}
    >
      <UserAvatar
        displayName={profile?.displayName ?? "?"}
        avatarBlobId={profile?.avatarBlobId}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{profile?.displayName ?? "Loading..."}</div>
        <div className="text-xs text-muted-foreground truncate">{principalText.slice(0, 12)}...</div>
      </div>
    </button>
  );
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm space-y-1",
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted/60 text-foreground rounded-bl-sm"
        )}
      >
        {message.imageUrl && (
          <img
            src={message.imageUrl}
            alt="Shared media"
            className="rounded-lg max-w-full max-h-48 object-cover"
          />
        )}
        {message.content && <p>{message.content}</p>}
        <p className={cn(
          "text-[10px] text-right",
          isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
        )}>
          {formatRelativeTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

interface ConversationViewProps {
  partnerPrincipal: Principal;
  onBack: () => void;
}

function ConversationView({ partnerPrincipal, onBack }: ConversationViewProps) {
  const { identity } = useInternetIdentity();
  const currentPrincipal = identity?.getPrincipal().toText();
  const [messageText, setMessageText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: partnerProfile } = useGetProfile(partnerPrincipal);
  const { data: messages = [], isLoading } = useGetMessages(partnerPrincipal);
  const sendMessage = useSendMessage();
  const markRead = useMarkConversationRead();
  const { upload } = useBlobStorage();
  const [uploading, setUploading] = useState(false);

  // Mark read on mount
  const markReadMutate = markRead.mutateAsync;
  useEffect(() => {
    markReadMutate(partnerPrincipal).catch(() => {});
  }, [partnerPrincipal, markReadMutate]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  });

  const handleSend = async () => {
    if (!messageText.trim() && !imageUrl.trim()) return;
    try {
      await sendMessage.mutateAsync({
        recipient: partnerPrincipal,
        content: messageText.trim(),
        imageUrl: imageUrl.trim() || null,
      });
      setMessageText("");
      setImageUrl("");
      setShowImageInput(false);
    } catch {
      toast.error("Failed to send message");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const blobId = await upload(file);
      setImageUrl(blobId);
      setShowImageInput(false);
      toast.success("Image ready to send");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Conversation header */}
      <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
        <button type="button" onClick={onBack} className="md:hidden p-1 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <UserAvatar
          displayName={partnerProfile?.displayName ?? "?"}
          avatarBlobId={partnerProfile?.avatarBlobId}
          size="sm"
        />
        <div>
          <div className="font-semibold text-sm">{partnerProfile?.displayName ?? "Loading..."}</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
                <Skeleton className={cn("h-10 rounded-2xl", i % 2 === 0 ? "w-32" : "w-48")} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id.toString()}
              message={msg}
              isOwn={msg.senderPrincipal.toText() === currentPrincipal}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Image URL preview */}
      {imageUrl && (
        <div className="px-4 py-2 border-t border-border flex items-center gap-2">
          <span className="text-xs text-muted-foreground flex-1 truncate">Image attached</span>
          <button type="button" onClick={() => setImageUrl("")} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border flex gap-2 items-center shrink-0">
        <label className="cursor-pointer p-2 text-muted-foreground hover:text-foreground transition-colors">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ImagePlus className="h-5 w-5" />
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
            disabled={uploading}
          />
        </label>
        <Input
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Message..."
          className="flex-1 bg-muted/30 border-border focus-visible:ring-primary/50 rounded-full"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        />
        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={(!messageText.trim() && !imageUrl) || sendMessage.isPending}
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-9 w-9 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function MessagesPage() {
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [conversations, setConversations] = useState<string[]>(getStoredConversations);
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebounce(searchText, 300);

  const { data: searchResults = [] } = useSearchProfiles(debouncedSearch);
  const { upload } = useBlobStorage();
  void upload; // ensure hook called at component level

  const activePrincipal = activeConversation
    ? (() => { try { return Principal.fromText(activeConversation); } catch { return null; } })()
    : null;

  const handleSelectConversation = (principalText: string) => {
    addConversation(principalText);
    setConversations(getStoredConversations());
    setActiveConversation(principalText);
    setSearchText("");
  };

  return (
    <main className="flex h-[calc(100vh-4rem)] md:h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "w-full md:w-72 border-r border-border flex flex-col bg-sidebar shrink-0",
          activeConversation && "hidden md:flex"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-border">
          <h1 className="font-semibold mb-3 text-sm font-mono-display uppercase tracking-wide text-muted-foreground">
            Messages
          </h1>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Find a user to message..."
              className="pl-9 bg-muted/30 border-border text-sm focus-visible:ring-primary/50 rounded-xl"
            />
            {/* Search dropdown */}
            {debouncedSearch && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-xl z-30 overflow-hidden max-h-48 overflow-y-auto">
                {searchResults.map((profile) => (
                  <div
                    key={profile.displayName}
                    className="flex items-center gap-2 px-3 py-2.5 hover:bg-accent/50 transition-colors"
                  >
                    <div
                      className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0"
                    >
                      {profile.displayName[0]?.toUpperCase() ?? "?"}
                    </div>
                    <span className="text-sm flex-1 truncate">{profile.displayName}</span>
                    <span className="text-xs text-muted-foreground">View only</span>
                  </div>
                ))}
                <div className="px-3 py-2 text-xs text-muted-foreground/60 border-t border-border">
                  To message someone, use their principal ID
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground font-medium">No conversations yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Search for a user and start chatting
              </p>
            </div>
          ) : (
            conversations.map((principalText) => (
              <ConversationPartner
                key={principalText}
                principalText={principalText}
                isActive={activeConversation === principalText}
                onClick={() => handleSelectConversation(principalText)}
              />
            ))
          )}
        </div>
      </aside>

      {/* Conversation area */}
      <div
        className={cn(
          "flex-1 flex flex-col",
          !activeConversation && "hidden md:flex"
        )}
      >
        {activePrincipal ? (
          <ConversationView
            partnerPrincipal={activePrincipal}
            onBack={() => setActiveConversation(null)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h2 className="font-semibold text-lg mb-2">Your messages</h2>
            <p className="text-muted-foreground text-sm max-w-[260px]">
              Select a conversation or search for a user to start chatting
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
