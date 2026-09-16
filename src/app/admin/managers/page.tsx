"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail, Phone, UserSquare2, Headset, CalendarClock, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/providers/toast-provider";
import type { Manager } from "@/lib/types";

export default function AdminManagersPage() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const pushToast = useToast();

  function load() {
    apiFetch<Manager[]>("/api/managers")
      .then(setManagers)
      .catch((err) => console.error("Failed to load managers:", err))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(manager: Manager) {
    const count =
      (manager._count?.callers ?? 0) +
      (manager._count?.profilesAdded ?? 0) +
      (manager._count?.interviewsCreated ?? 0);
    const warning =
      count > 0
        ? ` This deletes their ${manager._count?.callers ?? 0} caller(s), ${
            manager._count?.profilesAdded ?? 0
          } candidate profile(s), and ${manager._count?.interviewsCreated ?? 0} interview(s) too.`
        : "";
    if (!confirm(`Delete manager ${manager.name}?${warning}`)) return;

    setBusyId(manager.id);
    try {
      await apiFetch(`/api/managers/${manager.id}`, { method: "DELETE" });
      pushToast("success", "Manager deleted.");
      load();
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Failed to delete manager");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Managers</h2>
        <p className="text-sm text-muted-foreground">
          Every manager account and their team&apos;s activity.
        </p>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading managers...</p>}
      {!loading && managers.length === 0 && (
        <Card className="p-10 text-center text-muted-foreground">No managers yet.</Card>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {managers.map((manager) => (
          <Card key={manager.id} className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground font-semibold">
                  {manager.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{manager.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <Mail className="h-3 w-3 shrink-0" /> <span className="truncate">{manager.email}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(manager)}
                disabled={busyId === manager.id}
                className="p-1.5 rounded-md text-muted-foreground hover:bg-danger/10 hover:text-danger cursor-pointer shrink-0"
                aria-label="Delete manager"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {manager.phone && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" /> {manager.phone}
              </p>
            )}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border text-center">
              <Link
                href={`/admin/profiles?managerId=${manager.id}`}
                className="rounded-md p-2 hover:bg-muted"
              >
                <UserSquare2 className="h-4 w-4 mx-auto text-muted-foreground" />
                <p className="text-sm font-semibold mt-1">{manager._count?.profilesAdded ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">Profiles</p>
              </Link>
              <Link
                href={`/admin/callers?managerId=${manager.id}`}
                className="rounded-md p-2 hover:bg-muted"
              >
                <Headset className="h-4 w-4 mx-auto text-muted-foreground" />
                <p className="text-sm font-semibold mt-1">{manager._count?.callers ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">Callers</p>
              </Link>
              <Link
                href={`/admin/interviews?managerId=${manager.id}`}
                className="rounded-md p-2 hover:bg-muted"
              >
                <CalendarClock className="h-4 w-4 mx-auto text-muted-foreground" />
                <p className="text-sm font-semibold mt-1">{manager._count?.interviewsCreated ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">Interviews</p>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
