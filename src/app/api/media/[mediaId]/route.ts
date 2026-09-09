import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/server/apiError";
import { AuthorisationError, canEditPack, getSessionUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";

export const runtime = "nodejs";

const patchSchema = z.object({
  caption: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  siteNumber: z.number().int().min(1).max(50).nullable().optional(),
});

async function loadEditable(mediaId: string) {
  const user = await getSessionUser();
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: mediaId },
    include: { pack: true },
  });
  if (!asset) return { asset: null, user } as const;
  if (!canEditPack(user, asset.pack)) throw new AuthorisationError("You cannot edit this pack");
  return { asset, user } as const;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  try {
    const { mediaId } = await params;
    const { asset } = await loadEditable(mediaId);
    if (!asset) return NextResponse.json({ error: "Media not found" }, { status: 404 });

    const input = patchSchema.parse(await request.json());
    let siteId = asset.siteId;
    if (input.siteNumber !== undefined) {
      if (input.siteNumber === null) {
        siteId = null;
      } else {
        const site = await prisma.site.findUnique({
          where: { packId_number: { packId: asset.packId, number: input.siteNumber } },
        });
        if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });
        siteId = site.id;
      }
    }

    await prisma.mediaAsset.update({
      where: { id: mediaId },
      data: {
        caption: input.caption ?? asset.caption,
        sortOrder: input.sortOrder ?? asset.sortOrder,
        siteId,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  try {
    const { mediaId } = await params;
    const { asset } = await loadEditable(mediaId);
    if (!asset) return NextResponse.json({ error: "Media not found" }, { status: 404 });
    await prisma.mediaAsset.delete({ where: { id: mediaId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
