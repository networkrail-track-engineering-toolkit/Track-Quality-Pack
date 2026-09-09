import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/server/apiError";
import { AuthorisationError, canEditPack, getSessionUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import {
  MAX_UPLOAD_BYTES,
  buildStorageKey,
  isAllowedContentType,
  putObject,
} from "@/lib/server/storage";

export const runtime = "nodejs";

const metadataSchema = z.object({
  kind: z.enum(["PHOTO", "TRACE", "CCQ_CHART", "DIAGRAM_PAGE"]),
  sectionId: z.string().max(64).optional(),
  siteNumber: z.coerce.number().int().min(1).max(50).optional(),
  caption: z.string().max(500).default(""),
  pageNumber: z.coerce.number().int().min(1).max(2000).optional(),
  capturedAt: z.string().datetime().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  gpsAccuracy: z.coerce.number().min(0).max(100000).optional(),
  locationNote: z.string().max(200).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ packId: string }> },
) {
  try {
    await getSessionUser();
    const { packId } = await params;
    const kind = request.nextUrl.searchParams.get("kind") ?? undefined;
    const media = await prisma.mediaAsset.findMany({
      where: {
        packId,
        ...(kind ? { kind: kind as "PHOTO" | "TRACE" | "CCQ_CHART" | "DIAGRAM_PAGE" } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { annotations: true, site: { select: { number: true } } },
    });
    return NextResponse.json({
      media: media.map((asset) => ({
        id: asset.id,
        kind: asset.kind,
        fileName: asset.fileName,
        contentType: asset.contentType,
        caption: asset.caption,
        sortOrder: asset.sortOrder,
        pageNumber: asset.pageNumber,
        capturedAt: asset.capturedAt,
        siteNumber: asset.site?.number,
        hasLocation: asset.latitude !== null && asset.longitude !== null,
        latitude: asset.latitude,
        longitude: asset.longitude,
        gpsAccuracy: asset.gpsAccuracy,
        annotations: asset.annotations[0]?.shapes ?? [],
      })),
    });
  } catch (error) {
    return apiError(error);
  }
}

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

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "A file is required" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "File is larger than 25 MB" }, { status: 413 });
    }
    if (!isAllowedContentType(file.type)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
    }

    const metadata = metadataSchema.parse(Object.fromEntries(form.entries()));

    let siteId: string | null = null;
    if (metadata.siteNumber !== undefined) {
      const site = await prisma.site.findUnique({
        where: { packId_number: { packId, number: metadata.siteNumber } },
      });
      if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });
      siteId = site.id;
    }

    const extension = file.type.split("/")[1]?.split("+")[0] ?? "bin";
    const storageKey = buildStorageKey(packId, extension);
    await putObject(storageKey, Buffer.from(await file.arrayBuffer()), file.type);

    const count = await prisma.mediaAsset.count({ where: { packId, kind: metadata.kind } });
    const asset = await prisma.mediaAsset.create({
      data: {
        packId,
        siteId,
        kind: metadata.kind,
        sectionId: metadata.sectionId ?? null,
        storageKey,
        contentType: file.type,
        fileName: file.name.slice(0, 200),
        caption: metadata.caption,
        sortOrder: count,
        pageNumber: metadata.pageNumber ?? null,
        capturedAt: metadata.capturedAt ? new Date(metadata.capturedAt) : new Date(),
        latitude: metadata.latitude ?? null,
        longitude: metadata.longitude ?? null,
        gpsAccuracy: metadata.gpsAccuracy ?? null,
        locationNote: metadata.locationNote ?? null,
      },
    });

    return NextResponse.json({ id: asset.id }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
