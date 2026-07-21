import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/infrastructure/database/prisma";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import {
  getAuthSecret,
  getAuthTrustHost,
  shouldUseSecureAuthCookies,
} from "@/config/env";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  basePath: "/api/auth",
  secret: getAuthSecret(),
  trustHost: getAuthTrustHost(),
  useSecureCookies: shouldUseSecureAuthCookies(),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const role = (user as unknown as { role?: unknown }).role;
        if (role === "admin" || role === "owner") {
          token.role = role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "admin" | "owner";
      }
      return session;
    },
  },
});
