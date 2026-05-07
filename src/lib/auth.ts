import { NextAuthOptions, getServerSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "./db";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 15 * 60,
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || user.deactivatedAt) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.roles = (user as any).roles;
      }

      return token;
    },
    async session({ session, token }) {
      (session.user as any).id = token.id;
      (session.user as any).roles = token.roles;
      return session;
    },
  },
};

export function getSession() {
  return getServerSession(authOptions);
}