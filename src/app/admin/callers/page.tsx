"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, Phone, Send, Trash2, Pencil, Check, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCallers } from "@/hooks/use-callers";
import { useToast } from "@/components/providers/toast-provider";
import { apiFetch } from "@/lib/api";
import type { Manager, Caller } from "@/lib/types";

export default function AdminCallersPage() {
  return (
    <Suspense fallback={null}>
      <AdminCallersInner />
    </Suspense>
  );
}

function AdminCallersInner() {
  const searchParams = useSearchParams();
  const [managerId, setManagerId] = useState(searchParams.get("managerId") ?? "");
  const [managers, setManagers] = useState<Manager[]>([]);
  const { callers, loading, refresh } = useCallers({ managerId: managerId || undefined });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reassignTo, setReassignTo] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const pushToast = useToast();

  useEffect(() => {
    apiFetch<Manager[]>("/api/managers").then(setManagers).catch(() => {});
  }, []);

  function startEdit(caller: Caller) {
    setEditingId(caller.id);
    setReassignTo(caller.managerId ?? "");
  }

  async function saveReassign(caller: Caller) {
    if (!reassignTo || reassignTo === caller.managerId) {
      setEditingId(null);
      return;
    }
    setBusyId(caller.id);
    try {
      await apiFetch(`/api/callers/${caller.id}`, {
        method: "PATCH",
        body: JSON.stringify({ managerId: reassignTo }),
      });
      pushToast("success", `${caller.name} reassigned.`);
      setEditingId(null);
      refresh();
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Failed to reassign caller");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(caller: Caller) {
    if (!confirm(`Delete ${caller.name}?`)) return;
    setBusyId(caller.id);
    try {
      await apiFetch(`/api/callers/${caller.id}`, { method: "DELETE" });
      pushToast("success", "Caller deleted.");
      refresh();
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Failed to delete caller");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Callers</h2>
        <p className="text-sm text-muted-foreground">
          Every caller across the organization. Reassign a caller to a different manager or
          remove their account.
        </p>
      </div>

      <Select value={managerId} onChange={(e) => setManagerId(e.target.value)} className="max-w-[220px]">
        <option value="">All managers</option>
        {managers.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </Select>

      {loading && <p className="text-sm text-muted-foreground">Loading callers...</p>}
      {!loading && callers.length === 0 && (
        <Card className="p-10 text-center text-muted-foreground">No callers found.</Card>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {callers.map((caller) => (
          <Card key={caller.id} className="p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground font-semibold">
                  {caller.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{caller.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    Manager: {caller.manager?.name ?? "—"}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => startEdit(caller)}
                  className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                  aria-label="Reassign"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(caller)}
                  disabled={busyId === caller.id}
                  className="p-1.5 rounded-md text-muted-foreground hover:bg-danger/10 hover:text-danger cursor-pointer"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-1.5 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" /> {caller.email}
              </p>
              {caller.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" /> {caller.phone}
                </p>
              )}
              {caller.telegramUsername && (
                <p className="flex items-center gap-2">
                  <Send className="h-3.5 w-3.5" /> @{caller.telegramUsername}
                  {caller.telegramLinked ? (
                    <Badge variant="success">Linked</Badge>
                  ) : (
                    <Badge variant="warning">Not linked</Badge>
                  )}
                </p>
              )}
            </div>

            {editingId === caller.id && (
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Select
                  value={reassignTo}
                  onChange={(e) => setReassignTo(e.target.value)}
                  className="h-8 text-xs"
                >
                  <option value="">Select manager...</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </Select>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => saveReassign(caller)}
                  disabled={busyId === caller.id}
                >
                  {busyId === caller.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
