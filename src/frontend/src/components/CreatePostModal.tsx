import { useState, useRef } from "react";
import { X, ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useBlobStorage } from "../hooks/useBlobStorage";
import { useCreatePost } from "../hooks/useQueries";

interface CreatePostModalProps {
  onClose: () => void;
}

export function CreatePostModal({ onClose }: CreatePostModalProps) {
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload } = useBlobStorage();
  const createPost = useCreatePost();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const handleSubmit = async () => {
    if (!selectedFile) { toast.error("Please select an image"); return; }

    setUploading(true);
    try {
      const blobId = await upload(selectedFile);
      await createPost.mutateAsync({ caption, imageBlobId: blobId });
      toast.success("Post created!");
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Failed to create post");
    } finally {
      setUploading(false);
    }
  };

  const isLoading = uploading || createPost.isPending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div
        role="document"
        className="relative z-10 w-full max-w-md bg-card border border-border rounded-2xl overflow-hidden animate-slide-up shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold font-mono-display text-sm tracking-wide uppercase text-muted-foreground">
            Create Post
          </h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {/* Image upload area */}
          {preview ? (
            <div className="relative rounded-xl overflow-hidden">
              <img src={preview} alt="Preview" className="w-full aspect-square object-cover" />
              <button
                type="button"
                onClick={() => { setSelectedFile(null); setPreview(""); }}
                className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "w-full aspect-square rounded-xl border-2 border-dashed border-border",
                "flex flex-col items-center justify-center gap-3",
                "text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors",
                "bg-muted/20"
              )}
            >
              <ImagePlus className="h-10 w-10" />
              <span className="text-sm font-medium">Click to select photo</span>
              <span className="text-xs text-muted-foreground">JPG, PNG, GIF, WEBP</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Caption */}
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption..."
            className="resize-none bg-muted/20 border-border text-sm min-h-[80px] focus-visible:ring-primary/50"
            maxLength={2200}
          />

          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{caption.length}/2200</span>
            <Button
              onClick={handleSubmit}
              disabled={!selectedFile || isLoading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                "Share"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
