import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/server/apiError";
import { getSessionUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { getObject } from "@/lib/server/storage";

export const runtime = "nodejs";

/** Streams the stored file to authenticated users only. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  try {
    await getSessionUser();
    const { mediaId } = await params;
    const asset = await prisma.mediaAsset.findUnique({ where: { id: mediaId } });
    if (!asset) return NextResponse.json({ error: "Media not found" }, { status: 404 });
    const data = await getObject(asset.storageKey);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": asset.contentType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(asset.fileName)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
