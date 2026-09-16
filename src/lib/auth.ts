import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          managerId: user.managerId,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Re-check the user against the DB on every session read (not just at
    // login): a JWT stays "valid" even after its user is deleted (e.g. an
    // admin removes a manager/caller while they're still signed in
    // elsewhere), and every route trusts session.user.id to reference a real
    // row -- without this check that leads to foreign-key-violation 500s
    // instead of a clean "please sign in again". This also lets a caller who
    // gets claimed by a manager see their data immediately, without needing
    // to sign out and back in.
    session: async (params) => {
      const session = await authConfig.callbacks!.session!(params);
      if (!session.user?.id) return session;

      const current = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { managerId: true },
      });

      if (!current) {
        return { ...session, user: undefined } as unknown as typeof session;
      }

      session.user.managerId = current.managerId ?? null;
      return session;
    },
  },
});
