"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, Phone, ExternalLink, FileText, Search, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { ProfileForm, type ProfileFormValues } from "@/components/profiles/profile-form";
import { useProfiles } from "@/hooks/use-profiles";
import { useToast } from "@/components/providers/toast-provider";
import { apiFetch } from "@/lib/api";
import type { CandidateProfile, Manager } from "@/lib/types";

export default function AdminProfilesPage() {
  return (
    <Suspense fallback={null}>
      <AdminProfilesInner />
    </Suspense>
  );
}

function AdminProfilesInner() {
  const searchParams = useSearchParams();
  const [managerId, setManagerId] = useState(searchParams.get("managerId") ?? "");
  const [search, setSearch] = useState("");
  const [managers, setManagers] = useState<Manager[]>([]);
  const { profiles, loading, refresh } = useProfiles({ search, managerId: managerId || undefined });
  const [editing, setEditing] = useState<CandidateProfile | null>(null);
  const pushToast = useToast();

  useEffect(() => {
    apiFetch<Manager[]>("/api/managers").then(setManagers).catch(() => {});
  }, []);

  async function handleUpdate(values: ProfileFormValues) {
    if (!editing) return;
    await apiFetch(`/api/profiles/${editing.id}`, {
      method: "PATCH",
      body: JSON.stringify(values),
    });
    pushToast("success", "Profile updated.");
    setEditing(null);
    refresh();
  }

  async function handleDelete(profile: CandidateProfile) {
    if (!confirm(`Delete ${profile.name}? This also removes their interviews.`)) return;
    try {
      await apiFetch(`/api/profiles/${profile.id}`, { method: "DELETE" });
      pushToast("success", "Profile deleted.");
      refresh();
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Failed to delete profile");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Candidate Profiles</h2>
        <p className="text-sm text-muted-foreground">All candidate profiles across every manager.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-9"
          />
        </div>
        <Select
          value={managerId}
          onChange={(e) => setManagerId(e.target.value)}
          className="max-w-[220px]"
        >
          <option value="">All managers</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading profiles...</p>}
      {!loading && profiles.length === 0 && (
        <Card className="p-10 text-center text-muted-foreground">No profiles found.</Card>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {profiles.map((profile) => (
          <Card key={profile.id} className="p-5 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground font-semibold">
                  {profile.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{profile.name}</p>
                  <p className="text-xs text-muted-foreground truncate">Added by {profile.manager?.name}</p>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => setEditing(profile)}
                  className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                  aria-label="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(profile)}
                  className="p-1.5 rounded-md text-muted-foreground hover:bg-danger/10 hover:text-danger cursor-pointer"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground pt-1">
              {profile.email && (
                <p className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" /> {profile.email}
                </p>
              )}
              {profile.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" /> {profile.phone}
                </p>
              )}
              {(profile.city || profile.state) && (
                <p className="text-xs">
                  {[profile.city, profile.state, profile.zip].filter(Boolean).join(", ")}
                </p>
              )}
              {profile.linkedinUrl && (
                <a
                  href={profile.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> LinkedIn
                </a>
              )}
              {profile.resumeUrl && (
                <a
                  href={profile.resumeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <FileText className="h-3.5 w-3.5" /> Resume
                </a>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Dialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Edit ${editing?.name ?? ""}`}
      >
        {editing && (
          <ProfileForm initial={editing} onSubmit={handleUpdate} submitLabel="Save changes" />
        )}
      </Dialog>
    </div>
  );
}
