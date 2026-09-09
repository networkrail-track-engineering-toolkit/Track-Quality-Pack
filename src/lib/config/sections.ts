import {
  TEF3071_GROUPS,
  TEF3207_GROUPS,
  TQS_PACK_GROUPS,
  TQS_SITE_GROUPS,
  type FieldGroup,
} from "./fields";

export type SectionKind = "form" | "diagram" | "media";

export interface SectionDef {
  /** Stable identifier stored in the database. */
  id: string;
  /** Worksheet name in `TRACK QUALITY PACK.xlsx`. `_` marks the site number. */
  worksheet: string;
  title: string;
  /** URL-safe route segment. */
  slug: string;
  kind: SectionKind;
  /** One instance per site when true. */
  siteSpecific: boolean;
  packGroups?: readonly FieldGroup[];
  siteGroups?: readonly FieldGroup[];
  /** Media kind handled by media sections. */
  mediaKind?: "PHOTO" | "TRACE" | "CCQ_CHART" | "DIAGRAM_PAGE";
}

export const SECTIONS: readonly SectionDef[] = [
  {
    id: "tqs-form",
    worksheet: "TQS FORM",
    title: "TQS Form",
    slug: "tqs-form",
    kind: "form",
    siteSpecific: false,
    packGroups: TQS_PACK_GROUPS,
    siteGroups: TQS_SITE_GROUPS,
  },
  {
    id: "diagram",
    worksheet: "DIAGRAM",
    title: "Diagram",
    slug: "diagram",
    kind: "diagram",
    siteSpecific: false,
    mediaKind: "DIAGRAM_PAGE",
  },
  {
    id: "trace",
    worksheet: "TRACE",
    title: "Trace",
    slug: "trace",
    kind: "media",
    siteSpecific: false,
    mediaKind: "TRACE",
  },
  {
    id: "ccq-chart",
    worksheet: "CCQ CHART",
    title: "CCQ Chart",
    slug: "ccq-chart",
    kind: "media",
    siteSpecific: false,
    mediaKind: "CCQ_CHART",
  },
  {
    id: "tef3071",
    worksheet: "TEF 3071 SITE _",
    title: "TEF3071",
    slug: "tef3071",
    kind: "form",
    siteSpecific: true,
    siteGroups: TEF3071_GROUPS,
  },
  {
    id: "tef3207",
    worksheet: "TEF3207 SITE _",
    title: "TEF3207",
    slug: "tef3207",
    kind: "form",
    siteSpecific: true,
    siteGroups: TEF3207_GROUPS,
  },
];

export function getSection(idOrSlug: string): SectionDef | undefined {
  return SECTIONS.find((s) => s.id === idOrSlug || s.slug === idOrSlug);
}

/** Worksheet name for a section instance, e.g. `TEF 3071 SITE 2`. */
export function worksheetName(section: SectionDef, siteNumber?: number): string {
  if (!section.siteSpecific) return section.worksheet;
  if (!siteNumber) throw new Error(`Site number required for ${section.id}`);
  return section.worksheet.replace("_", String(siteNumber));
}

/**
 * Navigation order: non site-specific sections first, then one instance of each
 * site-specific section per site, in site order.
 */
export interface NavEntry {
  sectionId: string;
  slug: string;
  title: string;
  siteNumber?: number;
  siteName?: string;
  href: string;
}

export function buildNavigation(
  packId: string,
  sites: { number: number; name: string }[],
): NavEntry[] {
  const entries: NavEntry[] = [];
  for (const section of SECTIONS) {
    if (!section.siteSpecific) {
      entries.push({
        sectionId: section.id,
        slug: section.slug,
        title: section.title,
        href: `/packs/${packId}/${section.slug}`,
      });
    } else {
      for (const site of sites) {
        entries.push({
          sectionId: section.id,
          slug: section.slug,
          title: `${section.title} - Site ${site.number}${site.name ? ` (${site.name})` : ""}`,
          siteNumber: site.number,
          siteName: site.name,
          href: `/packs/${packId}/${section.slug}?site=${site.number}`,
        });
      }
    }
  }
  return entries;
}
