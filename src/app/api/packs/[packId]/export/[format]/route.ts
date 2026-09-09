import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/server/apiError";
import { getSessionUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { loadPack } from "@/lib/server/packService";
import { buildWorkbook } from "@/lib/server/excelExport";
import { buildPackPdf, type PdfMedia } from "@/lib/server/pdfExport";
import { buildStorageKey, putObject } from "@/lib/server/storage";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Generates the Excel or PDF export from the saved database state. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ packId: string; format: string }> },
) {
  try {
    const user = await getSessionUser();
    const { packId, format } = await params;
    if (format !== "excel" && format !== "pdf") {
      return NextResponse.json({ error: "Unsupported export format" }, { status: 400 });
    }

    const pack = await loadPack(packId);
    if (!pack) return NextResponse.json({ error: "Pack not found" }, { status: 404 });

    const assets = await prisma.mediaAsset.findMany({
      where: { packId },
      orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
      include: { annotations: true, site: { select: { number: true } } },
    });

    let body: Buffer;
    let contentType: string;
    let fileName: string;

    if (format === "excel") {
      body = await buildWorkbook(pack, {
        includeImages: true,
        media: assets.map((asset) => ({
          storageKey: asset.storageKey,
          contentType: asset.contentType,
          kind: asset.kind,
          siteNumber: asset.site?.number,
        })),
      });
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      fileName = `${pack.reference}.xlsx`;
    } else {
      const media: PdfMedia[] = assets.map((asset) => ({
        id: asset.id,
        kind: asset.kind,
        sectionId: asset.sectionId,
        fileName: asset.fileName,
        contentType: asset.contentType,
        storageKey: asset.storageKey,
        caption: asset.caption,
        pageNumber: asset.pageNumber,
        siteNumber: asset.site?.number,
        capturedAt: asset.capturedAt?.toISOString() ?? null,
        latitude: asset.latitude,
        longitude: asset.longitude,
        annotations: asset.annotations[0]?.shapes ?? [],
      }));
      body = await buildPackPdf(pack, media);
      contentType = "application/pdf";
      fileName = `${pack.reference}.pdf`;
    }

    const storageKey = buildStorageKey(packId, format === "excel" ? "xlsx" : "pdf");
    await putObject(storageKey, body, contentType);
    await prisma.export.create({
      data: { packId, format, storageKey, createdById: user.id },
    });

    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
