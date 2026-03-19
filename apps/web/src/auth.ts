import NextAuth from "next-auth";
import { authAdapter } from "@/lib/auth-session";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: authAdapter,
  session: {
    strategy: "database",
  },
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [],
  callbacks: {
    session: async ({ session, user, token }) => {
      if (session.user) {
        session.user.id = user?.id ?? token?.sub ?? "";
        session.user.role =
          user && "role" in user && typeof user.role === "string"
            ? user.role
            : typeof token?.role === "string"
              ? token.role
              : "USER";
      }

      return session;
    },
  },
});
