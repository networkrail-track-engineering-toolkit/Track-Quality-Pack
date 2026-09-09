import { describe, expect, it } from "vitest";
import { getSection } from "@/lib/config/sections";
import {
  allowedFieldIds,
  sectionValuesSchema,
  validatePack,
  validateSection,
} from "@/lib/domain/validation";
import { applySharedValues, dependentFields } from "@/lib/domain/sharedData";
import {
  maxStandardDeviation,
  tef3071RequiresMitigation,
  tef3207Summary,
} from "@/lib/domain/calculations";

const tqs = getSection("tqs-form")!;
const tef3071 = getSection("tef3071")!;
const tef3207 = getSection("tef3207")!;

describe("validation", () => {
  it("reports missing mandatory TQS Form fields", () => {
    const issues = validateSection(tqs, {});
    expect(issues.map((issue) => issue.fieldId)).toContain("tgs");
    expect(issues.map((issue) => issue.fieldId)).toContain("location");
  });

  it("checks dropdown values against the workbook option lists", () => {
    const issues = validateSection(tqs, { tgs: "NOT A NAME", location: "Doncaster", date: "2026-01-01" });
    expect(issues.some((issue) => issue.fieldId === "tgs")).toBe(true);
  });

  it("checks date and time formats", () => {
    const issues = validateSection(tqs, { date: "01/01/2026" });
    expect(issues.some((issue) => issue.message.includes("must be a date"))).toBe(true);
  });

  it("rejects unknown fields on the server", () => {
    expect(() => sectionValuesSchema(tqs).parse({ evil: "value" })).toThrow();
    expect(() => sectionValuesSchema(tqs).parse({ tgs: "C. GRANT" })).not.toThrow();
  });

  it("allows the repeating TEF3071 tables and TEF3207 ticks", () => {
    const ids = allowedFieldIds(tef3071);
    expect(ids).toContain("ramp.in.0m.designCant");
    expect(ids).toContain("checklist.twist");
    expect(allowedFieldIds(tef3207)).toContain("condition.cwr.17");
  });

  it("requires at least one site before a pack can be reviewed", () => {
    const issues = validatePack({ packValues: {}, sites: [] });
    expect(issues.some((issue) => issue.fieldId === "sites")).toBe(true);
  });
});

describe("shared data model", () => {
  const context = {
    pack: { tgs: "C. GRANT", location: "Loversall", date: "2026-03-01" },
    site: { elr: "ECM1", line: "UP MAIN", lineSpeed: "125", postSdTop: 2.1 },
  };

  it("populates TEF3071 fields from the TQS Form", () => {
    const merged = applySharedValues(tef3071, {}, context);
    expect(merged.location).toBe("Loversall");
    expect(merged.elr).toBe("ECM1");
    expect(merged.publishedSpeed).toBe("125");
    expect(merged.postMaxVerticalSd).toBe(2.1);
  });

  it("never overwrites a value entered by the user", () => {
    const merged = applySharedValues(tef3071, { elr: "ECM2" }, context);
    expect(merged.elr).toBe("ECM2");
  });

  it("populates TEF3207 fields from the TQS Form", () => {
    const merged = applySharedValues(tef3207, {}, context);
    expect(merged.locationName).toBe("Loversall");
    expect(merged.recordDate).toBe("2026-03-01");
  });

  it("lists the sections that depend on a shared field", () => {
    const dependents = dependentFields("pack.location");
    expect(dependents).toContainEqual({ sectionId: "tef3071", fieldId: "location" });
    expect(dependents).toContainEqual({ sectionId: "tef3207", fieldId: "locationName" });
  });
});

describe("calculations", () => {
  it("returns the worst recorded standard deviation", () => {
    expect(maxStandardDeviation([1.2, 3.4, null, 2])).toBe(3.4);
    expect(maxStandardDeviation([null, undefined])).toBeNull();
  });

  it("flags a TEF3071 checklist that needs mitigation", () => {
    expect(tef3071RequiresMitigation({ "checklist.twist": "YES" })).toBe(false);
    expect(tef3071RequiresMitigation({ "checklist.twist": "NO" })).toBe(true);
  });

  it("derives the governing TEF3207 condition category", () => {
    const summary = tef3207Summary({
      conditionTrackKind: "cwr",
      "condition.cwr.3": true,
      "condition.cwr.11": true,
    });
    expect(summary.selectedConditions).toEqual([3, 11]);
    expect(summary.governingCondition).toBe(11);
    expect(summary.governingConditionText).toContain("not consolidated");
  });

  it("uses the jointed track list when jointed track is selected", () => {
    const summary = tef3207Summary({ conditionTrackKind: "jointed", "condition.jointed.5": true });
    expect(summary.trackKind).toBe("jointed");
    expect(summary.governingConditionText).toBe("Mechanised stoneblown");
  });
});
