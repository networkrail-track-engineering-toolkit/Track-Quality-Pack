import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/server/apiError";
import { AuthorisationError, canEditPack, getSessionUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { saveSection } from "@/lib/server/packService";

export const runtime = "nodejs";

const bodySchema = z.object({
  values: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  siteNumber: z.number().int().min(1).max(50).optional(),
  expectedVersion: z.number().int().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ packId: string; sectionId: string }> },
) {
  try {
    const user = await getSessionUser();
    const { packId, sectionId } = await params;
    const pack = await prisma.pack.findUnique({ where: { id: packId } });
    if (!pack) return NextResponse.json({ error: "Pack not found" }, { status: 404 });
    if (!canEditPack(user, pack)) throw new AuthorisationError("You cannot edit this pack");

    const body = bodySchema.parse(await request.json());
    const result = await saveSection({
      packId,
      sectionId,
      siteNumber: body.siteNumber,
      values: body.values,
      expectedVersion: body.expectedVersion,
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
