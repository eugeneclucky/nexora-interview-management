"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/providers/toast-provider";

/** Self-uploading avatar picker for an already-authenticated user (e.g. their
 * own Settings page) -- selecting a file uploads it immediately via
 * /api/avatar. For the signup flow, where there's no session yet to upload
 * against, see the inline file handling in the signup page instead. */
export function AvatarUploader({
  avatarUrl,
  name,
  onChange,
  size = 80,
}: {
  avatarUrl: string | null | undefined;
  name: string;
  onChange: (avatarUrl: string) => void;
  size?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const pushToast = useToast();

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/avatar", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onChange(data.avatarUrl);
      pushToast("success", "Profile photo updated.");
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar src={avatarUrl} name={name} size={size} />
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>
        )}
      </div>
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Camera className="h-3.5 w-3.5" />
          {avatarUrl ? "Change photo" : "Upload photo"}
        </Button>
        <p className="mt-1 text-xs text-muted-foreground">JPEG, PNG, or WebP. Up to 5MB.</p>
      </div>
    </div>
  );
}
