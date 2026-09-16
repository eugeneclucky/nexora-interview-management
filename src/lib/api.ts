import { signOut } from "next-auth/react";

export class ApiError extends Error {}

let signingOut = false;

export async function apiFetch<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore parse errors
    }

    // The session's user no longer exists (e.g. their account was removed
    // while still signed in) or otherwise isn't valid anymore. The JWT
    // cookie itself is still well-formed, so middleware's edge-safe check
    // (which can't hit the DB) still thinks they're logged in -- a plain
    // redirect to /login would just get bounced straight back to the
    // dashboard by middleware, looping forever. Signing out first clears
    // that cookie, so /login actually sticks.
    if (res.status === 401 && typeof window !== "undefined" && !signingOut) {
      signingOut = true;
      signOut({ callbackUrl: "/login" });
    }

    throw new ApiError(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
