import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/server/apiError";
import { AuthorisationError, canEditPack, getSessionUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { annotationDocumentSchema } from "@/lib/domain/annotations";

export const runtime = "nodejs";

/** Saves the structured annotation overlay. The original file is untouched. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  try {
    const user = await getSessionUser();
    const { mediaId } = await params;
    const asset = await prisma.mediaAsset.findUnique({
      where: { id: mediaId },
      include: { pack: true },
    });
    if (!asset) return NextResponse.json({ error: "Media not found" }, { status: 404 });
    if (!canEditPack(user, asset.pack)) throw new AuthorisationError("You cannot edit this pack");

    const body = await request.json();
    const shapes = annotationDocumentSchema.parse(body.shapes ?? []);

    await prisma.annotation.upsert({
      where: { mediaId },
      update: { shapes },
      create: { mediaId, shapes },
    });
    return NextResponse.json({ ok: true, count: shapes.length });
  } catch (error) {
    return apiError(error);
  }
}
