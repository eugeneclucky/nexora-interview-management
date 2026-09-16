"use client";

import { useRef, useState } from "react";
import { FileText, Upload, X, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/providers/toast-provider";

export function ResumeUploader({
  resumeUrl,
  resumeName,
  onChange,
}: {
  resumeUrl: string | null | undefined;
  resumeName: string | null | undefined;
  onChange: (value: { resumeUrl: string; resumeName: string } | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const pushToast = useToast();

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onChange({ resumeUrl: data.url, resumeName: data.fileName });
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (resumeUrl) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2">
        <FileText className="h-4 w-4 text-primary shrink-0" />
        <a
          href={resumeUrl}
          target="_blank"
          rel="noreferrer"
          className="flex-1 truncate text-sm text-foreground hover:underline"
        >
          {resumeName || "View resume"}
        </a>
        <a href={resumeUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
          <ExternalLink className="h-4 w-4" />
        </a>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-muted-foreground hover:text-danger cursor-pointer"
          aria-label="Remove resume"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
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
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full justify-start"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {uploading ? "Uploading..." : "Upload resume (PDF or Word)"}
      </Button>
    </div>
  );
}
