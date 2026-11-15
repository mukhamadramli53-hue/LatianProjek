import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export async function POST() {
  const session = await auth();
  if (session?.user?.id) {
    await writeAuditLog({ actorId: session.user.id, action: "LOGOUT", entity: "Auth" });
  }
  return NextResponse.json({ success: true });
}
