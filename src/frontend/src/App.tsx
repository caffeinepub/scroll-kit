import { useState } from "react";
import {
  createRouter,
  createRoute,
  createRootRoute,
  RouterProvider,
  Outlet,
  useNavigate,
  useParams,
  Link,
} from "@tanstack/react-router";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useGetCallerUserProfile, useSaveCallerUserProfile } from "./hooks/useQueries";
import { useBlobStorage } from "./hooks/useBlobStorage";
import { useQueryClient } from "@tanstack/react-query";
import { NavBar } from "./components/NavBar";
import { HomePage } from "./pages/HomePage";
import { ExplorePage } from "./pages/ExplorePage";
import { MessagesPage } from "./pages/MessagesPage";
import { ProfilePage } from "./pages/ProfilePage";
import { NotificationsPage } from "./pages/NotificationsPage";

// Export navigate and params hooks for use in components
export { useNavigate, useParams, Link };

// ─── Login Screen ────────────────────────────────────────────────────────────

function LoginScreen() {
  const { login, isLoggingIn } = useInternetIdentity();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full animate-fade-in">
        <div className="mb-2">
          <h1 className="font-mono-display font-bold text-5xl tracking-tight">
            scroll<span className="text-primary">kit</span>
          </h1>
        </div>
        <p className="text-muted-foreground text-lg mb-12 font-light tracking-wide">
          Share your world
        </p>

        <div className="w-full bg-card border border-border rounded-2xl p-8 space-y-4 shadow-2xl">
          <div className="space-y-1 text-center mb-6">
            <h2 className="font-semibold text-lg">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Sign in to continue</p>
          </div>

          <Button
            onClick={login}
            disabled={isLoggingIn}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-xl text-sm h-12 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            {isLoggingIn ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Connecting...</>
            ) : (
              "Sign in with Internet Identity"
            )}
          </Button>

          <p className="text-xs text-muted-foreground/60 text-center">
            Secure, decentralized authentication on the Internet Computer
          </p>
        </div>

        <p className="mt-8 text-xs text-muted-foreground/40">
          © 2026{" "}
          <a
            href="https://caffeine.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted-foreground transition-colors"
          >
            Built with ♥ using caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}

// ─── Profile Setup Screen ─────────────────────────────────────────────────────

function ProfileSetupScreen() {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const saveProfile = useSaveCallerUserProfile();
  const { upload } = useBlobStorage();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) { toast.error("Display name is required"); return; }
    setIsSubmitting(true);
    try {
      let avatarBlobId: string | undefined;
      if (avatarFile) {
        avatarBlobId = await upload(avatarFile);
      }
      await saveProfile.mutateAsync({
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarBlobId,
      });
      toast.success("Profile created! Welcome to Scroll Kit!");
    } catch {
      toast.error("Failed to create profile");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/8 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <h1 className="font-mono-display font-bold text-3xl tracking-tight mb-2">
            scroll<span className="text-primary">kit</span>
          </h1>
          <p className="text-muted-foreground text-sm">Set up your profile to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-5 shadow-xl">
          <div className="flex flex-col items-center gap-3">
            <label className="cursor-pointer group">
              <div className="h-20 w-20 rounded-full border-2 border-dashed border-border group-hover:border-primary/60 transition-colors overflow-hidden bg-muted/30 flex items-center justify-center">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <Upload className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </label>
            <span className="text-xs text-muted-foreground">
              {avatarPreview ? "Change photo" : "Add profile photo (optional)"}
            </span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Display Name *
            </Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="bg-muted/30 border-border focus-visible:ring-primary/50"
              maxLength={50}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Bio
            </Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell people about yourself..."
              className="bg-muted/30 border-border resize-none focus-visible:ring-primary/50"
              rows={3}
              maxLength={150}
            />
            <span className="text-xs text-muted-foreground">{bio.length}/150</span>
          </div>

          <Button
            type="submit"
            disabled={!displayName.trim() || isSubmitting}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 h-11 rounded-xl"
          >
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating profile...</>
            ) : (
              "Create profile"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ─── Root Layout ──────────────────────────────────────────────────────────────

function RootLayout() {
  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="md:ml-64 pb-16 md:pb-0">
        <Outlet />
      </div>
    </div>
  );
}

// ─── Route Definitions ────────────────────────────────────────────────────────

const rootRoute = createRootRoute({
  component: RootLayout,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const exploreRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/explore",
  component: ExplorePage,
});

const messagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/messages",
  component: MessagesPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfilePage,
});

const profileWithIdRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile/$principalId",
  component: ProfilePage,
});

const notificationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/notifications",
  component: NotificationsPage,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  exploreRoute,
  messagesRoute,
  profileRoute,
  profileWithIdRoute,
  notificationsRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// ─── App Content ──────────────────────────────────────────────────────────────

function AppContent() {
  const { identity, isInitializing } = useInternetIdentity();
  const queryClient = useQueryClient();
  const isAuthenticated = !!identity;

  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched: profileFetched,
  } = useGetCallerUserProfile();

  // Ensure blob storage hook called at component level
  useBlobStorage();
  void queryClient;

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  const showProfileSetup = isAuthenticated && profileFetched && userProfile === null;

  if (showProfileSetup) {
    return <ProfileSetupScreen />;
  }

  return <RouterProvider router={router} />;
}

// ─── Root Export ──────────────────────────────────────────────────────────────

export default function App() {
  return (
    <>
      <Toaster
        theme="dark"
        toastOptions={{
          style: {
            background: "oklch(0.16 0 0)",
            border: "1px solid oklch(0.23 0 0)",
            color: "oklch(0.97 0 0)",
          },
        }}
      />
      <AppContent />
    </>
  );
}
