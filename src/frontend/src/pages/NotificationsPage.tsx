import { useNavigate } from "@tanstack/react-router";
import { Heart, MessageCircle, UserPlus, Mail, BellOff, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { NotificationType } from "../backend.d";
import type { Notification } from "../backend.d";
import {
  useGetNotifications,
  useMarkAllNotificationsRead,
  useGetProfile,
} from "../hooks/useQueries";
import { UserAvatar } from "../components/UserAvatar";
import { formatRelativeTime } from "../utils/helpers";

interface NotificationItemProps {
  notification: Notification;
}

function NotificationItem({ notification }: NotificationItemProps) {
  const navigate = useNavigate();
  const { data: fromProfile } = useGetProfile(notification.fromPrincipal);

  const typeIcon = {
    [NotificationType.like]: <Heart className="h-4 w-4 text-red-500" fill="currentColor" />,
    [NotificationType.comment]: <MessageCircle className="h-4 w-4 text-blue-400" />,
    [NotificationType.follow]: <UserPlus className="h-4 w-4 text-green-400" />,
    [NotificationType.dm]: <Mail className="h-4 w-4 text-purple-400" />,
  };

  const handleClick = () => {
    if (notification._type === NotificationType.follow) {
      void navigate({ to: "/profile/$principalId", params: { principalId: notification.fromPrincipal.toText() } });
    } else if (notification._type === NotificationType.dm) {
      void navigate({ to: "/messages" });
    }
  };

  const isClickable =
    notification._type === NotificationType.follow ||
    notification._type === NotificationType.dm;

  const content = (
    <>
      <div className="relative shrink-0">
        <UserAvatar
          displayName={fromProfile?.displayName ?? "?"}
          avatarBlobId={fromProfile?.avatarBlobId}
          size="sm"
        />
        <div className="absolute -bottom-0.5 -right-0.5 bg-card rounded-full p-0.5">
          {typeIcon[notification._type]}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-semibold">{fromProfile?.displayName ?? "Someone"}</span>{" "}
          <span className="text-foreground/80">{notification.message}</span>
        </p>
        <span className="text-xs text-muted-foreground">{formatRelativeTime(notification.timestamp)}</span>
      </div>

      {!notification.isRead && (
        <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
      )}
    </>
  );

  if (isClickable) {
    return (
      <button
        type="button"
        className={cn(
          "w-full flex items-center gap-3 p-4 rounded-xl transition-colors text-left",
          !notification.isRead && "bg-primary/5",
          "cursor-pointer hover:bg-accent/50"
        )}
        onClick={handleClick}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl transition-colors",
        !notification.isRead && "bg-primary/5"
      )}
    >
      {content}
    </div>
  );
}

export function NotificationsPage() {
  const { data: notifications = [], isLoading } = useGetNotifications();
  const markAllRead = useMarkAllNotificationsRead();

  const handleMarkAllRead = async () => {
    try {
      await markAllRead.mutateAsync();
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark notifications as read");
    }
  };

  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <main className="max-w-xl mx-auto py-6 px-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <h1 className="font-semibold text-lg">Notifications</h1>
        {hasUnread && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={markAllRead.isPending}
            className="text-primary hover:text-primary/80 text-xs"
          >
            <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
            Mark all read
          </Button>
        )}
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-14 w-14 rounded-2xl bg-muted/40 flex items-center justify-center mb-4">
            <BellOff className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">No notifications yet</p>
        </div>
      ) : (
        <ul className="space-y-1 list-none">
          {notifications.map((notification) => (
            <li key={notification.id.toString()}>
              <NotificationItem notification={notification} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
