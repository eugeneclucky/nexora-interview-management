"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, Mail, Phone, Send, Trash2, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Avatar } from "@/components/avatar";
import { useCallers } from "@/hooks/use-callers";
import { useToast } from "@/components/providers/toast-provider";
import { apiFetch } from "@/lib/api";

export default function ManagerCallersPage() {
  const { data: session } = useSession();
  const { callers, loading, refresh } = useCallers({ mine: true });
  const { callers: unassigned, loading: loadingUnassigned, refresh: refreshUnassigned } =
    useCallers({ unassigned: true });
  const [open, setOpen] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const pushToast = useToast();

  async function claim(callerId: string, name: string) {
    if (!session?.user?.id) return;
    setClaimingId(callerId);
    try {
      await apiFetch(`/api/callers/${callerId}`, {
        method: "PATCH",
        body: JSON.stringify({ managerId: session.user.id }),
      });
      pushToast("success", `${name} added to your team.`);
      refresh();
      refreshUnassigned();
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Failed to claim caller");
    } finally {
      setClaimingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Callers</h2>
          <p className="text-sm text-muted-foreground">
            Callers you manage. They can only see interviews and profiles you&apos;ve added.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add caller
        </Button>
      </div>

      {!loadingUnassigned && unassigned.length > 0 && (
        <Card className="p-5 space-y-3">
          <div>
            <h3 className="font-semibold">Unassigned callers</h3>
            <p className="text-sm text-muted-foreground">
              These callers signed up but don&apos;t belong to a manager yet. Claim one to add
              them to your team.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {unassigned.map((caller) => (
              <div
                key={caller.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{caller.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{caller.email}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={claimingId === caller.id}
                  onClick={() => claim(caller.id, caller.name)}
                  className="shrink-0"
                >
                  {claimingId === caller.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5" />
                  )}
                  Claim
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {loading && <p className="text-sm text-muted-foreground">Loading callers...</p>}
      {!loading && callers.length === 0 && (
        <Card className="p-10 text-center text-muted-foreground">
          No callers yet. Add one, or ask them to sign up as a caller — you can claim them
          from the Unassigned callers list above.
        </Card>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {callers.map((caller) => (
          <Card key={caller.id} className="p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar src={caller.avatarUrl} name={caller.name} size={40} />
                <div className="min-w-0">
                  <p className="font-medium truncate">{caller.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {caller._count?.interviewsAssigned ?? 0} interviews assigned
                  </p>
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!confirm(`Remove ${caller.name}?`)) return;
                  try {
                    await apiFetch(`/api/callers/${caller.id}`, { method: "DELETE" });
                    pushToast("success", "Caller removed.");
                    refresh();
                  } catch (err) {
                    pushToast("error", err instanceof Error ? err.message : "Failed to remove caller");
                  }
                }}
                className="p-1.5 rounded-md text-muted-foreground hover:bg-danger/10 hover:text-danger cursor-pointer shrink-0"
                aria-label="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
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
          </Card>
        ))}
      </div>

      <AddCallerDialog
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => {
          setOpen(false);
          refresh();
        }}
      />
    </div>
  );
}

function AddCallerDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pushToast = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/callers", {
        method: "POST",
        body: JSON.stringify({ name, email, phone, telegramUsername, password }),
      });
      pushToast("success", `${name} added as a caller.`);
      setName("");
      setEmail("");
      setPhone("");
      setTelegramUsername("");
      setPassword("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add a caller"
      description="Create login credentials for a new caller on your team."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="c-name">Full name</Label>
          <Input id="c-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="c-email">Email</Label>
          <Input
            id="c-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="c-phone">Phone</Label>
          <Input id="c-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="c-telegram">Telegram username</Label>
          <Input
            id="c-telegram"
            value={telegramUsername}
            onChange={(e) => setTelegramUsername(e.target.value)}
            placeholder="https://t.me/nexcessillion or @nexcessillion"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            They&apos;ll get a Telegram reminder 30 and 10 minutes before each interview once
            they message our bot.
          </p>
        </div>
        <div>
          <Label htmlFor="c-password">Temporary password</Label>
          <Input
            id="c-password"
            type="text"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>
        {error && (
          <p className="text-sm text-danger bg-danger/10 rounded-md px-3 py-2">{error}</p>
        )}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Add caller
        </Button>
      </form>
    </Dialog>
  );
}
