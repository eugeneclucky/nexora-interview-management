import type { NextAuthConfig } from "next-auth";

// Edge-safe config (no Prisma / bcrypt here) shared between middleware and the full auth.ts.
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  // Required once this runs behind a reverse proxy (Railway, Render, Fly,
  // Nginx, etc.) -- otherwise NextAuth rejects the proxied request's Host
  // header as untrusted and auth breaks in production only.
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.managerId = user.managerId ?? null;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.managerId = token.managerId;
      }
      return session;
    },
  },
};
