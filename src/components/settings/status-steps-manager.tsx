"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown, Plus, Trash2, Loader2, Check, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStatusSteps } from "@/hooks/use-status-steps";
import { useToast } from "@/components/providers/toast-provider";
import { apiFetch } from "@/lib/api";
import type { StatusStep } from "@/lib/types";

export function StatusStepsManager() {
  const { steps, loading, refresh } = useStatusSteps("mine");
  const pushToast = useToast();
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const activeSteps = steps.filter((s) => s.kind === "ACTIVE").sort((a, b) => a.order - b.order);
  const specialSteps = steps.filter((s) => s.kind !== "ACTIVE");

  async function addStep(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    setAdding(true);
    try {
      await apiFetch("/api/status-steps", {
        method: "POST",
        body: JSON.stringify({ label: newLabel.trim() }),
      });
      setNewLabel("");
      refresh();
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Failed to add step");
    } finally {
      setAdding(false);
    }
  }

  async function saveLabel(id: string) {
    if (!editingLabel.trim()) return;
    setBusyId(id);
    try {
      await apiFetch(`/api/status-steps/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ label: editingLabel.trim() }),
      });
      setEditingId(null);
      refresh();
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Failed to rename step");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteStep(step: StatusStep) {
    if (!confirm(`Delete "${step.label}"?`)) return;
    setBusyId(step.id);
    try {
      await apiFetch(`/api/status-steps/${step.id}`, { method: "DELETE" });
      refresh();
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Failed to delete step");
    } finally {
      setBusyId(null);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= activeSteps.length) return;
    const reordered = [...activeSteps];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setBusyId(activeSteps[index].id);
    try {
      await apiFetch("/api/status-steps/reorder", {
        method: "PATCH",
        body: JSON.stringify({ orderedIds: reordered.map((s) => s.id) }),
      });
      refresh();
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Failed to reorder steps");
    } finally {
      setBusyId(null);
    }
  }

  function startEdit(step: StatusStep) {
    setEditingId(step.id);
    setEditingLabel(step.label);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interview status pipeline</CardTitle>
        <CardDescription>
          Customize the step names your team uses to track interview progress. Reorder them to
          match your process — the last one is treated as &quot;completed&quot;.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}

        <div className="space-y-2">
          {activeSteps.map((step, i) => (
            <div
              key={step.id}
              className="flex items-center gap-2 rounded-lg border border-border p-2"
            >
              <span className="w-6 text-center text-xs text-muted-foreground">{i + 1}</span>
              {editingId === step.id ? (
                <>
                  <Input
                    value={editingLabel}
                    onChange={(e) => setEditingLabel(e.target.value)}
                    className="h-8"
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => saveLabel(step.id)}
                    disabled={busyId === step.id}
                  >
                    {busyId === step.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">
                    {step.label}
                    {i === activeSteps.length - 1 && (
                      <span className="ml-2 text-xs text-success">(completed)</span>
                    )}
                  </span>
                  <Button type="button" size="icon" variant="ghost" onClick={() => startEdit(step)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={i === 0 || busyId === step.id}
                onClick={() => move(i, -1)}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={i === activeSteps.length - 1 || busyId === step.id}
                onClick={() => move(i, 1)}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={activeSteps.length <= 1 || busyId === step.id}
                onClick={() => deleteStep(step)}
              >
                <Trash2 className="h-3.5 w-3.5 text-danger" />
              </Button>
            </div>
          ))}
        </div>

        <form onSubmit={addStep} className="flex items-center gap-2">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Add a step (e.g. Reference check)"
            className="h-9"
          />
          <Button type="submit" size="sm" disabled={adding || !newLabel.trim()}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </Button>
        </form>

        <div className="pt-2 border-t border-border space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Fixed steps
          </p>
          {specialSteps.map((step) => (
            <div key={step.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
              {editingId === step.id ? (
                <>
                  <Input
                    value={editingLabel}
                    onChange={(e) => setEditingLabel(e.target.value)}
                    className="h-8"
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => saveLabel(step.id)}
                    disabled={busyId === step.id}
                  >
                    {busyId === step.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{step.label}</span>
                  <Button type="button" size="icon" variant="ghost" onClick={() => startEdit(step)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
