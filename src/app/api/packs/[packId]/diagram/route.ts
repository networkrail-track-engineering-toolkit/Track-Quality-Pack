import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { z } from "zod";
import { apiError } from "@/lib/server/apiError";
import { AuthorisationError, canEditPack, getSessionUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { buildStorageKey, putObject, readTemplate } from "@/lib/server/storage";
import { DIAGRAM_TEMPLATE } from "@/lib/config/templates";

export const runtime = "nodejs";

const bodySchema = z.object({
  pageNumber: z.number().int().min(1).max(5000),
  siteNumber: z.number().int().min(1).max(50).optional(),
  caption: z.string().max(500).default(""),
});

/**
 * Associates a page of the line diagram with the pack (and optionally a site).
 * The selected page is copied into protected storage so exports never depend on
 * the template remaining unchanged; the original PDF is not modified.
 */
export async function POST(
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
    const source = await PDFDocument.load(await readTemplate(DIAGRAM_TEMPLATE), {
      updateMetadata: false,
    });
    if (body.pageNumber > source.getPageCount()) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    let siteId: string | null = null;
    if (body.siteNumber !== undefined) {
      const site = await prisma.site.findUnique({
        where: { packId_number: { packId, number: body.siteNumber } },
      });
      if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });
      siteId = site.id;
    }

    const output = await PDFDocument.create();
    const [page] = await output.copyPages(source, [body.pageNumber - 1]);
    output.addPage(page);
    const storageKey = buildStorageKey(packId, "pdf");
    await putObject(storageKey, Buffer.from(await output.save()), "application/pdf");

    const count = await prisma.mediaAsset.count({ where: { packId, kind: "DIAGRAM_PAGE" } });
    const asset = await prisma.mediaAsset.create({
      data: {
        packId,
        siteId,
        kind: "DIAGRAM_PAGE",
        sectionId: "diagram",
        storageKey,
        contentType: "application/pdf",
        fileName: `diagram-page-${body.pageNumber}.pdf`,
        caption: body.caption,
        sortOrder: count,
        pageNumber: body.pageNumber,
        capturedAt: new Date(),
      },
    });
    return NextResponse.json({ id: asset.id }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
