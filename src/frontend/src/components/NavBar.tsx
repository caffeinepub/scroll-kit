import { useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, Compass, Plus, MessageCircle, User, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetUnreadNotificationCount, useGetCallerUserProfile } from "../hooks/useQueries";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { CreatePostModal } from "./CreatePostModal";
import { UserAvatar } from "./UserAvatar";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  action?: () => void;
}

export function NavBar() {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const { identity } = useInternetIdentity();
  const { data: unreadCount = BigInt(0) } = useGetUnreadNotificationCount();
  const { data: userProfile } = useGetCallerUserProfile();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const currentPrincipal = identity?.getPrincipal().toText();
  const unreadNum = Number(unreadCount);

  const navItems: NavItem[] = [
    { icon: <Home className="h-5 w-5" />, label: "Home", path: "/" },
    { icon: <Compass className="h-5 w-5" />, label: "Explore", path: "/explore" },
    { icon: <Plus className="h-5 w-5" />, label: "Create", path: "#", action: () => setShowCreateModal(true) },
    { icon: <MessageCircle className="h-5 w-5" />, label: "Messages", path: "/messages" },
    {
      icon: currentPrincipal && userProfile ? (
        <UserAvatar
          displayName={userProfile.displayName}
          avatarBlobId={userProfile.avatarBlobId}
          size="xs"
        />
      ) : (
        <User className="h-5 w-5" />
      ),
      label: "Profile",
      path: `/profile`,
    },
  ];

  const pathname = routerState.location.pathname;
  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path) && path !== "#";
  };

  const handleNav = (item: NavItem) => {
    if (item.action) {
      item.action();
    } else if (item.path !== "#") {
      void navigate({ to: item.path as "/" | "/explore" | "/messages" | "/profile" | "/notifications" });
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 h-full w-64 flex-col border-r border-border bg-sidebar p-4 z-40">
        {/* Logo */}
        <div className="mb-8 px-2 py-4">
          <h1 className="font-mono-display font-bold text-xl tracking-tight text-foreground">
            scroll<span className="text-primary">kit</span>
          </h1>
        </div>

        {/* Nav items */}
        <div className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleNav(item)}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all w-full",
                "hover:bg-accent/50 hover:text-foreground",
                isActive(item.path)
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground"
              )}
            >
              <div className="relative shrink-0">
                {item.icon}
                {item.label === "Messages" && unreadNum > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadNum > 9 ? "9+" : unreadNum}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
              {item.label === "Create" && (
                <span className="ml-auto text-xs text-muted-foreground">(+)</span>
              )}
            </button>
          ))}
        </div>

        {/* Notifications link in sidebar */}
        <button
          type="button"
          onClick={() => void navigate({ to: "/notifications" })}
          className={cn(
            "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all w-full",
            "hover:bg-accent/50 hover:text-foreground",
            pathname === "/notifications"
              ? "bg-accent text-foreground"
              : "text-muted-foreground"
          )}
        >
          <div className="relative shrink-0">
            <Bell className="h-5 w-5" />
            {unreadNum > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadNum > 9 ? "9+" : unreadNum}
              </span>
            )}
          </div>
          <span>Notifications</span>
        </button>

        {/* Footer */}
        <div className="mt-4 px-2 text-[11px] text-muted-foreground/60">
          © 2026.{" "}
          <a
            href="https://caffeine.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted-foreground transition-colors"
          >
            Built with ♥ using caffeine.ai
          </a>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-sidebar/95 backdrop-blur-sm">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleNav(item)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-w-0",
                item.label === "Create"
                  ? "text-foreground"
                  : isActive(item.path)
                    ? "text-primary"
                    : "text-muted-foreground"
              )}
            >
              <div className="relative">
                {item.label === "Create" ? (
                  <div className="h-9 w-9 bg-primary rounded-xl flex items-center justify-center shadow-lg">
                    <Plus className="h-5 w-5 text-primary-foreground" />
                  </div>
                ) : (
                  item.icon
                )}
              </div>
              {item.label !== "Create" && (
                <span className="text-[10px] font-medium">{item.label}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {showCreateModal && (
        <CreatePostModal onClose={() => setShowCreateModal(false)} />
      )}
    </>
  );
}
