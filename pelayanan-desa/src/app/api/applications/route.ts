/**
 * API Route: /api/applications
 *
 * GET  - List pengajuan milik user yang sedang login (WARGA only, filter by userId)
 * POST - Submit pengajuan baru (delegate ke server action)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { submitApplication, getMyApplications } from "@/lib/actions/application";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "WARGA") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusValue = searchParams.get("status");
    const validStatuses = ["DIAJUKAN", "DIVERIFIKASI", "DIPROSES", "REVIEW_SUPERVISOR", "MENUNGGU_APPROVAL", "DISETUJUI", "SELESAI", "PERLU_PERBAIKAN", "DITOLAK"] as const;
    const status = validStatuses.includes(statusValue as typeof validStatuses[number])
      ? statusValue as typeof validStatuses[number]
      : undefined;
    const applications = await getMyApplications({
      status,
      search: searchParams.get("search") || undefined,
      sort: searchParams.get("sort") === "asc" ? "asc" : "desc",
    });

    return NextResponse.json({ data: applications });
  } catch (err) {
    console.error("[GET /api/applications]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = await submitApplication(body);

    if (!result.success) {
      return NextResponse.json(result, { status: 422 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("[POST /api/applications]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
