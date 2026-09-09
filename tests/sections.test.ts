import { describe, expect, it } from "vitest";
import {
  SECTIONS,
  buildNavigation,
  getSection,
  worksheetName,
} from "@/lib/config/sections";
import {
  TQS_PACK_CELLS,
  TQS_SITE_OTM_CELLS,
  TQS_SITE_TRACK_CELLS,
  cellAddress,
} from "@/lib/config/cellMap";

describe("workbook sections", () => {
  it("provides a section for every relevant source worksheet", () => {
    const worksheets = SECTIONS.map((section) => section.worksheet);
    expect(worksheets).toEqual([
      "TQS FORM",
      "DIAGRAM",
      "TRACE",
      "CCQ CHART",
      "TEF 3071 SITE _",
      "TEF3207 SITE _",
    ]);
  });

  it("converts worksheet names into safe routes", () => {
    for (const section of SECTIONS) {
      expect(section.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("expands site-specific worksheet names", () => {
    const tef = getSection("tef3071")!;
    expect(worksheetName(tef, 3)).toBe("TEF 3071 SITE 3");
    expect(() => worksheetName(tef)).toThrow();
  });
});

describe("navigation", () => {
  it("creates one instance of each site-specific section per site", () => {
    const nav = buildNavigation("pack-1", [
      { number: 1, name: "Loversall" },
      { number: 2, name: "Black Carr" },
    ]);
    const tef3071 = nav.filter((entry) => entry.sectionId === "tef3071");
    expect(tef3071).toHaveLength(2);
    expect(tef3071[0].href).toBe("/packs/pack-1/tef3071?site=1");
    expect(tef3071[1].title).toContain("Site 2 (Black Carr)");
  });

  it("keeps the shared sections ahead of the site sections", () => {
    const nav = buildNavigation("pack-1", [{ number: 1, name: "" }]);
    expect(nav[0].sectionId).toBe("tqs-form");
    expect(nav.at(-1)?.sectionId).toBe("tef3207");
  });
});

describe("cell mapping", () => {
  it("uses the workbook cells for pack level fields", () => {
    expect(cellAddress(TQS_PACK_CELLS.tgs)).toBe("C2");
    expect(cellAddress(TQS_PACK_CELLS.location)).toBe("N2");
    expect(cellAddress(TQS_PACK_CELLS.date)).toBe("C15");
  });

  it("steps four rows per site in the Track Details band", () => {
    expect(cellAddress(TQS_SITE_TRACK_CELLS.elr, 1)).toBe("M25");
    expect(cellAddress(TQS_SITE_TRACK_CELLS.elr, 2)).toBe("M29");
    expect(cellAddress(TQS_SITE_TRACK_CELLS.trackId, 4)).toBe("M39");
  });

  it("steps four rows per site in the OTM Details band", () => {
    expect(cellAddress(TQS_SITE_OTM_CELLS.machineType, 1)).toBe("B48");
    expect(cellAddress(TQS_SITE_OTM_CELLS.preSdLine, 3)).toBe("I58");
  });
});
