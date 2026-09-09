import { SECTIONS, type SectionDef } from "@/lib/config/sections";
import type { SectionValues } from "./validation";

/**
 * Shared data model.
 *
 * TQS Form values are the single source of truth. Other sections declare
 * `sharedFrom: "pack.<field>"` or `sharedFrom: "site.<field>"` and inherit the
 * value unless the user has explicitly entered a different one.
 */
export interface SharedContext {
  /** TQS Form pack-level values. */
  pack: SectionValues;
  /** TQS Form values for the current site. */
  site: SectionValues;
}

export function resolveSharedValue(
  sharedFrom: string,
  context: SharedContext,
): SectionValues[string] | undefined {
  const [scope, field] = sharedFrom.split(".");
  if (scope === "pack") return context.pack[field];
  if (scope === "site") return context.site[field];
  return undefined;
}

/**
 * Merge stored section values with inherited TQS Form values. Stored values
 * always win, so a user override is never overwritten.
 */
export function applySharedValues(
  section: SectionDef,
  stored: SectionValues,
  context: SharedContext,
): SectionValues {
  const merged: SectionValues = { ...stored };
  for (const group of [...(section.packGroups ?? []), ...(section.siteGroups ?? [])]) {
    for (const field of group.fields) {
      if (!field.sharedFrom) continue;
      const current = merged[field.id];
      if (current === undefined || current === null || current === "") {
        const inherited = resolveSharedValue(field.sharedFrom, context);
        if (inherited !== undefined && inherited !== null && inherited !== "") {
          merged[field.id] = inherited;
        }
      }
    }
  }
  return merged;
}

/** Field identifiers in other sections that inherit from a TQS Form field. */
export function dependentFields(sharedFrom: string): { sectionId: string; fieldId: string }[] {
  const result: { sectionId: string; fieldId: string }[] = [];
  for (const section of SECTIONS) {
    for (const group of [...(section.packGroups ?? []), ...(section.siteGroups ?? [])]) {
      for (const field of group.fields) {
        if (field.sharedFrom === sharedFrom) {
          result.push({ sectionId: section.id, fieldId: field.id });
        }
      }
    }
  }
  return result;
}
