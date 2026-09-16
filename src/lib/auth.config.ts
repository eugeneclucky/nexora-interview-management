import type { NextAuthConfig } from "next-auth";

// Edge-safe config (no Prisma / bcrypt here) shared between middleware and the full auth.ts.
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
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
