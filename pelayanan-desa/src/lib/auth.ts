/**
 * NextAuth v5 (Auth.js) Configuration
 *
 * Menggunakan Credentials Provider + PrismaAdapter.
 * Callback JWT harus Edge-safe karena dipakai middleware. Validasi akun
 * terhadap database dilakukan oleh server action/API sebelum operasi sensitif.
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { Role } from "@prisma/client";

if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build" &&
  (!process.env.AUTH_SECRET ||
    process.env.AUTH_SECRET.length < 32 ||
    process.env.AUTH_SECRET.includes("dev-secret"))
) {
  throw new Error("AUTH_SECRET production wajib berupa secret acak minimal 32 karakter.");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt", // JWT untuk Credentials provider
    maxAge: 8 * 60 * 60, // 8 jam
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Cari user di database
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            password: true,
            role: true,
            isActive: true,
            image: true,
          },
        });

        if (!user || !user.password) {
          return null;
        }

        // Cek akun aktif
        if (!user.isActive) {
          throw new Error("Akun Anda telah dinonaktifkan. Hubungi admin.");
        }

        // Verifikasi password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    /**
     * Segarkan role dan status akun dari database pada setiap validasi token.
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: Role }).role;
        token.name = user.name;
        token.isActive = true;
      }
      return token;
    },
    /**
     * session callback: Meng-expose token ke client session.
     * Data di sini tersedia via useSession() / auth().
     */
    async session({ session, token }) {
      if (!token || token.isActive === false || !token.id || !token.role) {
        throw new Error("Session tidak aktif.");
      }
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      if (token.name) {
        session.user.name = token.name as string;
      }
      return session;
    },
  },
});
