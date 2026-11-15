/**
 * API Route: /api/applications/[id]
 *
 * GET - Detail pengajuan (hanya pemilik atau staf ke atas)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getApplicationDetail, resubmitApplication, transitionApplication } from "@/lib/actions/application";
import type { ApplicationStatus } from "@prisma/client";
import { z } from "zod";

const transitionSchema = z.object({
  status: z.enum(["DIAJUKAN", "DIVERIFIKASI", "DIPROSES", "REVIEW_SUPERVISOR", "MENUNGGU_APPROVAL", "DISETUJUI", "SELESAI", "PERLU_PERBAIKAN", "DITOLAK"]),
  note: z.string().max(2000).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const application = await getApplicationDetail(id);

    if (!application) {
      return NextResponse.json({ error: "Pengajuan tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ data: application });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith("Forbidden")) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("[GET /api/applications/[id]]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const parsed = transitionSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Status atau catatan tidak valid." }, { status: 422 });

    const result = await transitionApplication(id, parsed.data.status as ApplicationStatus, parsed.data.note);
    if (!result.success) {
      return NextResponse.json(result, { status: result.error.startsWith("Forbidden") ? 403 : 422 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[PATCH /api/applications/[id]]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const result = await resubmitApplication(id, await req.json());
    if (!result.success) {
      return NextResponse.json(result, { status: result.error.startsWith("Forbidden") ? 403 : 422 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[PUT /api/applications/[id]]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
