import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

function homeForRole(role?: string) {
  if (role === "MANAGER") return "/manager";
  if (role === "CALLER") return "/caller";
  if (role === "SUPER_ADMIN") return "/admin";
  return "/login";
}

export default auth((req) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  // Telegram calls this webhook directly (no session cookie); it authenticates
  // the request itself via the secret_token header instead.
  const isPublicApi =
    pathname.startsWith("/api/auth") || pathname === "/api/telegram/webhook";
  const isApi = pathname.startsWith("/api");
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (isPublicApi) return NextResponse.next();

  if (!isLoggedIn) {
    if (isApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAuthPage) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
    return NextResponse.next();
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL(homeForRole(role), nextUrl));
  }

  if (!isApi) {
    if (pathname.startsWith("/manager") && role !== "MANAGER" && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL(homeForRole(role), nextUrl));
    }
    if (pathname.startsWith("/caller") && role !== "CALLER") {
      return NextResponse.redirect(new URL(homeForRole(role), nextUrl));
    }
    if (pathname.startsWith("/admin") && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL(homeForRole(role), nextUrl));
    }
    if (pathname === "/link-telegram" && role !== "CALLER") {
      return NextResponse.redirect(new URL(homeForRole(role), nextUrl));
    }
    if (pathname === "/") {
      return NextResponse.redirect(new URL(homeForRole(role), nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)).*)"],
};
