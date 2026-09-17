"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, UserCog, Headset, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Avatar } from "@/components/avatar";
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
  const [telegramUsername, setTelegramUsername] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  function handleAvatarPick(file: File) {
    setAvatarFile(file);
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!role) {
      setError("Please choose an account type.");
      return;
    }
    if (role === "CALLER" && !avatarFile) {
      setError("Upload a profile photo to continue.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role, telegramUsername }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      const signInRes = await signIn("credentials", { email, password, redirect: false });
      if (signInRes?.error) {
        router.push("/login");
        return;
      }

      if (role === "CALLER" && avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        const avatarRes = await fetch("/api/avatar", { method: "POST", body: formData });
        if (!avatarRes.ok) {
          // The account already exists and they're signed in -- don't strand
          // them here. Let them in and they can add the photo from Settings.
          router.push("/");
          router.refresh();
          return;
        }
      }

      const needsTelegramLink = role === "CALLER" && Boolean(process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME);
      router.push(needsTelegramLink ? "/link-telegram" : "/");
      router.refresh();
    } finally {
      setLoading(false);
    }
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

            {role === "CALLER" && (
              <div>
                <Label>Profile photo *</Label>
                <div className="flex items-center gap-4">
                  <Avatar src={avatarPreview} name={name || "?"} size={64} />
                  <div>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleAvatarPick(file);
                        e.target.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      <Camera className="h-3.5 w-3.5" />
                      {avatarFile ? "Change photo" : "Upload photo"}
                    </Button>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Required so managers and candidates recognize you. JPEG, PNG, or WebP.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {role === "CALLER" && (
              <div>
                <Label htmlFor="telegram">Telegram username</Label>
                <Input
                  id="telegram"
                  value={telegramUsername}
                  onChange={(e) => setTelegramUsername(e.target.value)}
                  placeholder="https://t.me/nexcessillion or @nexcessillion"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  We&apos;ll message you on Telegram 30 and 10 minutes before each interview.
                  Right after you sign up, we&apos;ll show you a one-tap link to connect it.
                </p>
              </div>
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
