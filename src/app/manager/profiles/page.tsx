"use client";

import { useState } from "react";
import {
  Plus,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  FileText,
  Pencil,
  Trash2,
  Search,
  CalendarPlus,
} from "lucide-react";
import Link from "next/link";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { ProfileForm, type ProfileFormValues } from "@/components/profiles/profile-form";
import { useProfiles } from "@/hooks/use-profiles";
import { useToast } from "@/components/providers/toast-provider";
import { apiFetch } from "@/lib/api";
import type { CandidateProfile } from "@/lib/types";

export default function ManagerProfilesPage() {
  const [search, setSearch] = useState("");
  const { profiles, loading, refresh } = useProfiles({ search, mine: true });
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<CandidateProfile | null>(null);
  const pushToast = useToast();

  async function handleCreate(values: ProfileFormValues) {
    await apiFetch("/api/profiles", { method: "POST", body: JSON.stringify(values) });
    pushToast("success", "Candidate profile added.");
    setAddOpen(false);
    refresh();
  }

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Candidate Profiles</h2>
          <p className="text-sm text-muted-foreground">
            Add and manage candidate profiles you&apos;re representing.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add profile
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="pl-9"
        />
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading profiles...</p>}
      {!loading && profiles.length === 0 && (
        <Card className="p-10 text-center text-muted-foreground">
          No candidate profiles yet. Add your first one to get started.
        </Card>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {profiles.map((profile) => (
          <Card key={profile.id} className="p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground font-semibold">
                  {profile.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{profile.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {profile._count?.interviews ?? 0} interview
                    {profile._count?.interviews === 1 ? "" : "s"}
                  </p>
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

            <div className="space-y-1.5 text-sm text-muted-foreground">
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
              {(profile.address || profile.city || profile.state) && (
                <p className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  {[profile.address, profile.city, profile.state, profile.zip]
                    .filter(Boolean)
                    .join(", ")}
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
                  <FileText className="h-3.5 w-3.5" /> {profile.resumeName || "Resume"}
                </a>
              )}
            </div>

            <Link
              href={`/manager/interviews/add?profileId=${profile.id}`}
              className={buttonClasses({ variant: "outline", size: "sm", className: "mt-auto justify-center" })}
            >
              <CalendarPlus className="h-4 w-4" /> Schedule interview
            </Link>
          </Card>
        ))}
      </div>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add candidate profile">
        <ProfileForm onSubmit={handleCreate} submitLabel="Add profile" />
      </Dialog>

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
