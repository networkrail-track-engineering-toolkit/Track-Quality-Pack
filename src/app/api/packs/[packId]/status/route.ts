import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/server/apiError";
import { AuthorisationError, canChangeStatus, getSessionUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { loadPack } from "@/lib/server/packService";

export const runtime = "nodejs";

const STATUSES = ["DRAFT", "IN_PROGRESS", "READY_FOR_REVIEW", "COMPLETE", "ARCHIVED"] as const;

const bodySchema = z.object({ status: z.enum(STATUSES) });

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ packId: string }> },
) {
  try {
    const user = await getSessionUser();
    const { packId } = await params;
    const pack = await prisma.pack.findUnique({ where: { id: packId } });
    if (!pack) return NextResponse.json({ error: "Pack not found" }, { status: 404 });

    const { status } = bodySchema.parse(await request.json());
    if (!canChangeStatus(user, pack, status)) {
      throw new AuthorisationError(`You cannot move this pack to ${status}`);
    }

    if (status === "READY_FOR_REVIEW" || status === "COMPLETE") {
      const view = await loadPack(packId);
      if (view && view.issues.length > 0) {
        return NextResponse.json(
          { error: "Validation issues must be resolved first", issues: view.issues },
          { status: 422 },
        );
      }
    }

    const updated = await prisma.pack.update({
      where: { id: packId },
      data: { status, version: { increment: 1 } },
    });
    return NextResponse.json({ status: updated.status, version: updated.version });
  } catch (error) {
    return apiError(error);
  }
}
