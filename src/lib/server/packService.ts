import { prisma } from "./db";
import { SECTIONS, getSection } from "@/lib/config/sections";
import { applySharedValues, type SharedContext } from "@/lib/domain/sharedData";
import {
  sectionValuesSchema,
  validatePack,
  validateSection,
  type SectionValues,
  type ValidationIssue,
} from "@/lib/domain/validation";

export interface PackSiteView {
  id: string;
  number: number;
  name: string;
  sections: Record<string, SectionValues>;
}

export interface PackView {
  id: string;
  reference: string;
  title: string;
  status: string;
  version: number;
  ownerId: string;
  updatedAt: string;
  packValues: SectionValues;
  sites: PackSiteView[];
  issues: ValidationIssue[];
}

export class ConcurrencyError extends Error {
  constructor() {
    super("This pack was updated by someone else. Reload before saving again.");
    this.name = "ConcurrencyError";
  }
}

export async function loadPack(packId: string): Promise<PackView | null> {
  const pack = await prisma.pack.findUnique({
    where: { id: packId },
    include: { sites: { orderBy: { number: "asc" } }, sections: true },
  });
  if (!pack) return null;

  const packValues =
    (pack.sections.find((s) => s.sectionId === "tqs-form" && s.siteId === null)
      ?.values as SectionValues) ?? {};

  const sites: PackSiteView[] = pack.sites.map((site) => {
    const stored: Record<string, SectionValues> = {};
    for (const row of pack.sections) {
      if (row.siteId === site.id) stored[row.sectionId] = (row.values as SectionValues) ?? {};
    }
    const context: SharedContext = { pack: packValues, site: stored["tqs-form"] ?? {} };
    const sections: Record<string, SectionValues> = {};
    for (const section of SECTIONS) {
      sections[section.id] = applySharedValues(section, stored[section.id] ?? {}, context);
    }
    return { id: site.id, number: site.number, name: site.name, sections };
  });

  const issues = validatePack({
    packValues,
    sites: sites.map((s) => ({ number: s.number, name: s.name, sections: s.sections })),
  });

  return {
    id: pack.id,
    reference: pack.reference,
    title: pack.title,
    status: pack.status,
    version: pack.version,
    ownerId: pack.ownerId,
    updatedAt: pack.updatedAt.toISOString(),
    packValues,
    sites,
    issues,
  };
}

export interface SaveSectionInput {
  packId: string;
  sectionId: string;
  siteNumber?: number;
  values: unknown;
  /** Optimistic concurrency guard supplied by the client. */
  expectedVersion?: number;
}

export interface SaveSectionResult {
  version: number;
  updatedAt: string;
  issues: ValidationIssue[];
}

/** Validate and persist a section, bumping the pack version atomically. */
export async function saveSection(input: SaveSectionInput): Promise<SaveSectionResult> {
  const section = getSection(input.sectionId);
  if (!section) throw new Error(`Unknown section '${input.sectionId}'`);

  const values = sectionValuesSchema(section).parse(input.values) as SectionValues;
  const issues = validateSection(section, values, input.siteNumber);

  return prisma.$transaction(async (tx) => {
    const pack = await tx.pack.findUnique({ where: { id: input.packId } });
    if (!pack) throw new Error("Pack not found");
    if (input.expectedVersion !== undefined && input.expectedVersion !== pack.version) {
      throw new ConcurrencyError();
    }

    let siteId: string | null = null;
    if (input.siteNumber !== undefined) {
      const site = await tx.site.findUnique({
        where: { packId_number: { packId: input.packId, number: input.siteNumber } },
      });
      if (!site) throw new Error(`Site ${input.siteNumber} does not exist`);
      siteId = site.id;
    }

    const existing = await tx.sectionData.findFirst({
      where: { packId: input.packId, sectionId: section.id, siteId },
    });
    if (existing) {
      await tx.sectionData.update({ where: { id: existing.id }, data: { values } });
    } else {
      await tx.sectionData.create({
        data: { packId: input.packId, sectionId: section.id, siteId, values },
      });
    }

    const updated = await tx.pack.update({
      where: { id: input.packId },
      data: {
        version: { increment: 1 },
        status: pack.status === "DRAFT" ? "IN_PROGRESS" : pack.status,
      },
    });

    return {
      version: updated.version,
      updatedAt: updated.updatedAt.toISOString(),
      issues,
    };
  });
}

export interface SetSiteCountResult {
  created: number[];
  removed: number[];
  /** Sites holding data that would be lost; deletion requires confirmation. */
  requiresConfirmation: number[];
}

/**
 * Create or remove sites. Reducing the site count never silently deletes data:
 * sites holding information are reported back and only removed when the caller
 * explicitly confirms.
 */
export async function setSiteCount(
  packId: string,
  count: number,
  confirmDeletion = false,
): Promise<SetSiteCountResult> {
  if (!Number.isInteger(count) || count < 1 || count > 50) {
    throw new Error("The number of sites must be between 1 and 50");
  }
  return prisma.$transaction(async (tx) => {
    const sites = await tx.site.findMany({
      where: { packId },
      orderBy: { number: "asc" },
      include: { sections: true, media: true },
    });

    const created: number[] = [];
    for (let number = 1; number <= count; number += 1) {
      if (!sites.some((s) => s.number === number)) {
        await tx.site.create({ data: { packId, number } });
        created.push(number);
      }
    }

    const surplus = sites.filter((s) => s.number > count);
    const holdingData = surplus.filter(
      (s) =>
        s.media.length > 0 ||
        s.sections.some((section) => Object.keys(section.values as object).length > 0),
    );

    if (holdingData.length > 0 && !confirmDeletion) {
      return {
        created,
        removed: [],
        requiresConfirmation: holdingData.map((s) => s.number),
      };
    }

    const removed: number[] = [];
    for (const site of surplus) {
      await tx.site.delete({ where: { id: site.id } });
      removed.push(site.number);
    }
    await tx.pack.update({ where: { id: packId }, data: { version: { increment: 1 } } });
    return { created, removed, requiresConfirmation: [] };
  });
}
