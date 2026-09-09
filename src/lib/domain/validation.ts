import { z } from "zod";
import {
  SECTIONS,
  getSection,
  type SectionDef,
} from "@/lib/config/sections";
import {
  TEF3071_CHECKLIST,
  TEF3071_RAMP_COLUMNS,
  TEF3071_RAMP_POSITIONS,
  TEF3071_WORK_TYPES,
  TEF3207_TICK_GROUPS,
  type FieldDef,
} from "@/lib/config/fields";

export type FieldValue = string | number | boolean | null;
export type SectionValues = Record<string, FieldValue>;

export interface ValidationIssue {
  sectionId: string;
  siteNumber?: number;
  fieldId: string;
  message: string;
}

const valueSchema = z.union([z.string().max(20000), z.number(), z.boolean(), z.null()]);

/** Server-side schema for a section payload. Unknown keys are rejected. */
export function sectionValuesSchema(section: SectionDef) {
  const allowed = new Set(allowedFieldIds(section));
  return z
    .record(z.string(), valueSchema)
    .superRefine((values, ctx) => {
      for (const key of Object.keys(values)) {
        if (!allowed.has(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Unknown field '${key}' for section '${section.id}'`,
            path: [key],
          });
        }
      }
    });
}

/** All field identifiers a section may store, including repeating tables. */
export function allowedFieldIds(section: SectionDef): string[] {
  const ids: string[] = [];
  for (const group of [...(section.packGroups ?? []), ...(section.siteGroups ?? [])]) {
    for (const field of group.fields) ids.push(field.id);
  }
  if (section.id === "tef3071") {
    for (const work of TEF3071_WORK_TYPES) ids.push(`workType.${work.id}`);
    for (const item of TEF3071_CHECKLIST) ids.push(`checklist.${item.id}`);
    for (const ramp of ["in", "out"]) {
      for (const position of TEF3071_RAMP_POSITIONS) {
        ids.push(`ramp.${ramp}.${position}.location`);
        for (const column of TEF3071_RAMP_COLUMNS) {
          ids.push(`ramp.${ramp}.${position}.${column.id}`);
        }
      }
    }
  }
  if (section.id === "tef3207") {
    for (const group of TEF3207_TICK_GROUPS) {
      for (const option of group.options) ids.push(`tick.${group.id}.${option}`);
    }
    ids.push("conditionTrackKind");
    for (let i = 1; i <= 17; i += 1) ids.push(`condition.cwr.${i}`);
    for (let i = 1; i <= 15; i += 1) ids.push(`condition.jointed.${i}`);
  }
  return ids;
}

function isEmpty(value: FieldValue | undefined): boolean {
  return value === undefined || value === null || value === "" || value === false;
}

export function validateSection(
  section: SectionDef,
  values: SectionValues,
  siteNumber?: number,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const groups = [...(section.packGroups ?? []), ...(section.siteGroups ?? [])];
  for (const group of groups) {
    for (const field of group.fields) {
      const value = values[field.id];
      if (field.required && isEmpty(value)) {
        issues.push({
          sectionId: section.id,
          siteNumber,
          fieldId: field.id,
          message: `${field.label} is required`,
        });
        continue;
      }
      if (isEmpty(value)) continue;
      const fieldIssue = validateFieldValue(field, value as FieldValue);
      if (fieldIssue) {
        issues.push({ sectionId: section.id, siteNumber, fieldId: field.id, message: fieldIssue });
      }
    }
  }
  return issues;
}

export function validateFieldValue(field: FieldDef, value: FieldValue): string | null {
  switch (field.type) {
    case "number": {
      const numeric = typeof value === "number" ? value : Number(value);
      if (Number.isNaN(numeric)) return `${field.label} must be a number`;
      return null;
    }
    case "date":
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return `${field.label} must be a date (YYYY-MM-DD)`;
      }
      return null;
    case "time":
      if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) {
        return `${field.label} must be a time (HH:MM)`;
      }
      return null;
    case "select":
    case "yesno": {
      const options = field.options ?? [];
      if (options.length > 0 && !options.includes(String(value))) {
        return `${field.label} must be one of: ${options.join(", ")}`;
      }
      return null;
    }
    default:
      return null;
  }
}

export interface PackSnapshot {
  packValues: SectionValues;
  sites: {
    number: number;
    name: string;
    sections: Record<string, SectionValues>;
  }[];
}

/** Validate the complete pack, used before marking it ready for review. */
export function validatePack(snapshot: PackSnapshot): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const tqs = getSection("tqs-form") as SectionDef;
  for (const group of tqs.packGroups ?? []) {
    for (const field of group.fields) {
      if (field.required && isEmpty(snapshot.packValues[field.id])) {
        issues.push({
          sectionId: tqs.id,
          fieldId: field.id,
          message: `${field.label} is required`,
        });
      }
    }
  }
  if (snapshot.sites.length === 0) {
    issues.push({
      sectionId: tqs.id,
      fieldId: "sites",
      message: "At least one site must be recorded in Track Details",
    });
  }
  for (const site of snapshot.sites) {
    for (const section of SECTIONS) {
      if (section.kind !== "form") continue;
      const values = site.sections[section.id] ?? {};
      for (const group of section.siteGroups ?? []) {
        for (const field of group.fields) {
          if (field.required && isEmpty(values[field.id])) {
            issues.push({
              sectionId: section.id,
              siteNumber: site.number,
              fieldId: field.id,
              message: `${field.label} is required`,
            });
          }
        }
      }
    }
  }
  return issues;
}
