"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, UserCog, Headset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/cn";

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<"MANAGER" | "CALLER" | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!role) {
      setError("Please choose an account type.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    const data = await res.json();

    if (!res.ok) {
      setLoading(false);
      setError(data.error || "Something went wrong.");
      return;
    }

    const signInRes = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (signInRes?.error) {
      router.push("/login");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between bg-primary text-primary-foreground p-10">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Logo size={32} />
          Nexora Consultant
        </div>
        <div className="space-y-3 max-w-md">
          <h1 className="text-3xl font-semibold leading-tight">
            Bring your recruiting team onto one shared calendar.
          </h1>
          <p className="text-primary-foreground/80">
            Managers track candidates and callers. Callers stay on top of
            every interview, in their own timezone.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/60">
          © {new Date().getFullYear()} Nexora Consultant
        </p>
      </div>

      <div className="flex flex-col p-6 sm:p-10">
        <div className="flex justify-between items-center">
          <div className="lg:hidden flex items-center gap-2 font-semibold">
            <Logo size={28} />
            Nexora Consultant
          </div>
          <ThemeToggle className="ml-auto" />
        </div>

        <div className="flex-1 flex items-center justify-center py-6">
          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold">Create your account</h2>
              <p className="text-sm text-muted-foreground">
                Choose how you&apos;ll use Nexora Consultant.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("MANAGER")}
                data-testid="role-manager"
                className={cn(
                  "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors cursor-pointer",
                  role === "MANAGER"
                    ? "border-primary bg-accent"
                    : "border-border hover:bg-muted"
                )}
              >
                <UserCog className="h-5 w-5 text-primary" />
                <div className="text-sm font-medium">Manager</div>
                <div className="text-xs text-muted-foreground">
                  Add profiles, manage callers, schedule interviews.
                </div>
              </button>
              <button
                type="button"
                onClick={() => setRole("CALLER")}
                data-testid="role-caller"
                className={cn(
                  "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors cursor-pointer",
                  role === "CALLER"
                    ? "border-primary bg-accent"
                    : "border-border hover:bg-muted"
                )}
              >
                <Headset className="h-5 w-5 text-primary" />
                <div className="text-sm font-medium">Caller</div>
                <div className="text-xs text-muted-foreground">
                  Handle interviews assigned by your manager.
                </div>
              </button>
            </div>

            {role === "CALLER" && (
              <p className="text-xs text-muted-foreground rounded-md bg-muted px-3 py-2">
                You&apos;ll sign up unassigned — a manager or admin will add you to their team
                shortly after.
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <Label htmlFor="confirm">Confirm</Label>
                  <Input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-danger bg-danger/10 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Create account
              </Button>
            </form>

            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
