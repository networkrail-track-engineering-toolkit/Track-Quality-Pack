import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/server/apiError";
import { AuthorisationError, canEditPack, getSessionUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { loadPack } from "@/lib/server/packService";

export const runtime = "nodejs";

const updateSchema = z.object({ title: z.string().min(1).max(200) });

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ packId: string }> },
) {
  try {
    await getSessionUser();
    const { packId } = await params;
    const pack = await loadPack(packId);
    if (!pack) return NextResponse.json({ error: "Pack not found" }, { status: 404 });
    return NextResponse.json(pack);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ packId: string }> },
) {
  try {
    const user = await getSessionUser();
    const { packId } = await params;
    const pack = await prisma.pack.findUnique({ where: { id: packId } });
    if (!pack) return NextResponse.json({ error: "Pack not found" }, { status: 404 });
    if (!canEditPack(user, pack)) throw new AuthorisationError("You cannot edit this pack");
    const input = updateSchema.parse(await request.json());
    const updated = await prisma.pack.update({
      where: { id: packId },
      data: { title: input.title, version: { increment: 1 } },
    });
    return NextResponse.json({ version: updated.version });
  } catch (error) {
    return apiError(error);
  }
}
