import ExcelJS from "exceljs";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { buildWorkbook } from "@/lib/server/excelExport";
import { buildPackPdf } from "@/lib/server/pdfExport";
import type { PackView } from "@/lib/server/packService";

const pack: PackView = {
  id: "pack-1",
  reference: "TQP-2026-001",
  title: "Loversall renewal",
  status: "IN_PROGRESS",
  version: 3,
  ownerId: "user-1",
  updatedAt: "2026-03-01T09:00:00.000Z",
  packValues: {
    tgs: "C. GRANT",
    location: "Loversall",
    date: "2026-03-01",
    comments: "Tamping follows stoneblowing.",
  },
  sites: [
    {
      id: "site-1",
      number: 1,
      name: "Loversall",
      sections: {
        "tqs-form": { elr: "ECM1", trackId: "1100", line: "UP MAIN", lineSpeed: "125" },
        tef3071: { location: "Loversall", elr: "ECM1" },
        tef3207: { locationName: "Loversall", conditionTrackKind: "cwr" },
      },
    },
    {
      id: "site-5",
      number: 5,
      name: "Black Carr",
      sections: {
        "tqs-form": { elr: "ECM2", trackId: "1200" },
        tef3071: {},
        tef3207: {},
      },
    },
  ],
  issues: [],
};

describe("Excel export", () => {
  it("writes pack and site values into the original template", async () => {
    const buffer = await buildWorkbook(pack);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(
      buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ) as ArrayBuffer,
    );

    const tqs = workbook.getWorksheet("TQS FORM")!;
    expect(tqs.getCell("C2").value).toBe("C. GRANT");
    expect(tqs.getCell("N2").value).toBe("Loversall");
    expect(tqs.getCell("M25").value).toBe("ECM1");
    // Site 5 is banded four rows below site 4.
    expect(tqs.getCell("M41").value).toBe("ECM2");
  });

  it("creates extra TEF worksheets for sites beyond the four in the template", async () => {
    const buffer = await buildWorkbook(pack);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(
      buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ) as ArrayBuffer,
    );
    expect(workbook.getWorksheet("TEF 3071 SITE 5")).toBeDefined();
    expect(workbook.getWorksheet("TEF3207 SITE 5")).toBeDefined();
  });
});

describe("PDF export", () => {
  it("produces a readable multi-page document", async () => {
    const buffer = await buildPackPdf(pack, []);
    expect(buffer.length).toBeGreaterThan(1000);
    const doc = await PDFDocument.load(buffer);
    expect(doc.getPageCount()).toBeGreaterThan(1);
  });
});
