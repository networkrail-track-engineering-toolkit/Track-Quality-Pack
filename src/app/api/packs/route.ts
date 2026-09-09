import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/server/db";
import { getSessionUser } from "@/lib/server/auth";
import { apiError } from "@/lib/server/apiError";
import { setSiteCount } from "@/lib/server/packService";

export const runtime = "nodejs";

const createSchema = z.object({
  reference: z.string().min(1).max(64),
  title: z.string().min(1).max(200),
  siteCount: z.number().int().min(1).max(50).default(1),
});

export async function GET() {
  try {
    const user = await getSessionUser();
    const packs = await prisma.pack.findMany({
      where: user.role === "CONTRIBUTOR" ? { ownerId: user.id } : {},
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        reference: true,
        title: true,
        status: true,
        updatedAt: true,
        _count: { select: { sites: true } },
      },
    });
    return NextResponse.json({ packs, user: { role: user.role, name: user.displayName } });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const input = createSchema.parse(await request.json());
    const existing = await prisma.pack.findUnique({ where: { reference: input.reference } });
    if (existing) {
      return NextResponse.json({ error: "Pack reference already exists" }, { status: 409 });
    }
    const pack = await prisma.pack.create({
      data: { reference: input.reference, title: input.title, ownerId: user.id },
    });
    await setSiteCount(pack.id, input.siteCount);
    return NextResponse.json({ id: pack.id }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
