/**
 * NextAuth v5 Route Handler
 * Handles semua /api/auth/* requests (sign-in, sign-out, session, dll)
 */

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
