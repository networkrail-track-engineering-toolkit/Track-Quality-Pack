import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/server/apiError";
import { AuthorisationError, canEditPack, getSessionUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { setSiteCount } from "@/lib/server/packService";

export const runtime = "nodejs";

const bodySchema = z.object({
  count: z.number().int().min(1).max(50),
  confirmDeletion: z.boolean().default(false),
  names: z.record(z.string(), z.string().max(120)).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ packId: string }> },
) {
  try {
    const user = await getSessionUser();
    const { packId } = await params;
    const pack = await prisma.pack.findUnique({ where: { id: packId } });
    if (!pack) return NextResponse.json({ error: "Pack not found" }, { status: 404 });
    if (!canEditPack(user, pack)) throw new AuthorisationError("You cannot edit this pack");

    const body = bodySchema.parse(await request.json());
    const result = await setSiteCount(packId, body.count, body.confirmDeletion);

    if (body.names) {
      for (const [number, name] of Object.entries(body.names)) {
        const siteNumber = Number(number);
        if (!Number.isInteger(siteNumber)) continue;
        await prisma.site.updateMany({ where: { packId, number: siteNumber }, data: { name } });
      }
    }

    return NextResponse.json(result, {
      status: result.requiresConfirmation.length > 0 ? 409 : 200,
    });
  } catch (error) {
    return apiError(error);
  }
}
