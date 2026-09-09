import ExcelJS from "exceljs";
import {
  TEF3071_CELLS,
  TEF3071_CHECKLIST_COLUMN,
  TEF3071_CHECKLIST_ROWS,
  TEF3071_RAMP_COLUMNS,
  TEF3071_RAMP_ROWS,
  TEF3071_WORK_TYPE_COLUMN,
  TEF3071_WORK_TYPE_ROWS,
  TEF3207_CELLS,
  TEF3207_CONDITION_CWR_COLUMN,
  TEF3207_CONDITION_FIRST_ROW,
  TEF3207_CONDITION_JOINTED_COLUMN,
  TEF3207_TICK_CELLS,
  TEF3207_TICK_CHARACTER,
  TQS_PACK_CELLS,
  TQS_SITE_OTM_CELLS,
  TQS_SITE_TRACK_CELLS,
  cellAddress,
  type CellRef,
} from "@/lib/config/cellMap";
import { TEF3071_RAMP_POSITIONS } from "@/lib/config/fields";
import type { PackView } from "./packService";
import { readTemplate } from "./storage";
import { getObject } from "./storage";

export const WORKBOOK_TEMPLATE = "TRACK QUALITY PACK.xlsx";

/** Highest site number provided as a worksheet in the source template. */
export const TEMPLATE_SITE_SHEETS = 4;

function writeCell(sheet: ExcelJS.Worksheet, address: string, value: unknown): void {
  if (value === undefined || value === null || value === "") return;
  const cell = sheet.getCell(address);
  // Never overwrite a formula-bearing template cell with a raw value silently:
  // the cross-sheet references in the template are replaced by the exported
  // value so the file opens without recalculation.
  cell.value = value as ExcelJS.CellValue;
}

function sheetFor(
  workbook: ExcelJS.Workbook,
  ref: CellRef,
  siteNumber: number,
): ExcelJS.Worksheet | undefined {
  const name = ref.sheet.replace("_", String(siteNumber));
  return workbook.getWorksheet(name);
}

/**
 * Clone a template worksheet for sites beyond those provided in the source
 * workbook. Row/column sizing, merges and styling are copied; unsupported
 * features are documented in IMPLEMENTATION_PLAN.md.
 */
function cloneWorksheet(
  workbook: ExcelJS.Workbook,
  sourceName: string,
  targetName: string,
): ExcelJS.Worksheet {
  const existing = workbook.getWorksheet(targetName);
  if (existing) return existing;
  const source = workbook.getWorksheet(sourceName);
  if (!source) throw new Error(`Template worksheet '${sourceName}' is missing`);
  const target = workbook.addWorksheet(targetName, {
    pageSetup: { ...source.pageSetup },
    properties: { ...source.properties },
    views: source.views,
  });
  target.columns = source.columns.map((column) => ({ width: column.width }));
  source.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const targetRow = target.getRow(rowNumber);
    targetRow.height = row.height;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const targetCell = targetRow.getCell(colNumber);
      targetCell.style = { ...cell.style };
      const value = cell.value;
      // Cross-sheet formulas are not valid on the clone, keep static values.
      targetCell.value =
        value && typeof value === "object" && "formula" in value ? null : value;
    });
    targetRow.commit();
  });
  for (const merge of Object.values(
    (source.model as unknown as { merges?: string[] }).merges ?? [],
  )) {
    try {
      target.mergeCells(merge);
    } catch {
      // Overlapping merges are skipped rather than corrupting the workbook.
    }
  }
  return target;
}

export interface ExcelExportOptions {
  /** Include photographs, traces and CCQ charts stored for the pack. */
  includeImages?: boolean;
  media?: {
    storageKey: string;
    contentType: string;
    kind: string;
    siteNumber?: number;
  }[];
}

/**
 * Build the completed Track Quality Pack workbook from the original template.
 * The template file on disk is never modified.
 */
export async function buildWorkbook(
  pack: PackView,
  options: ExcelExportOptions = {},
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await readTemplate(WORKBOOK_TEMPLATE));

  const tqs = workbook.getWorksheet("TQS FORM");
  if (!tqs) throw new Error("Template worksheet 'TQS FORM' is missing");

  for (const [fieldId, ref] of Object.entries(TQS_PACK_CELLS)) {
    writeCell(tqs, cellAddress(ref), pack.packValues[fieldId]);
  }

  for (const site of pack.sites) {
    const tqsValues = site.sections["tqs-form"] ?? {};
    for (const [fieldId, ref] of Object.entries({
      ...TQS_SITE_TRACK_CELLS,
      ...TQS_SITE_OTM_CELLS,
    })) {
      writeCell(tqs, cellAddress(ref, site.number), tqsValues[fieldId]);
    }

    if (site.number > TEMPLATE_SITE_SHEETS) {
      cloneWorksheet(workbook, "TEF 3071 SITE 1", `TEF 3071 SITE ${site.number}`);
      cloneWorksheet(workbook, "TEF3207 SITE 1", `TEF3207 SITE ${site.number}`);
    }

    const tef3071Values = site.sections["tef3071"] ?? {};
    const tef3071Sheet = sheetFor(
      workbook,
      { sheet: "TEF 3071 SITE _", column: "A", row: 1 },
      site.number,
    );
    if (tef3071Sheet) {
      for (const [fieldId, ref] of Object.entries(TEF3071_CELLS)) {
        writeCell(tef3071Sheet, cellAddress(ref), tef3071Values[fieldId]);
      }
      for (const [id, row] of Object.entries(TEF3071_WORK_TYPE_ROWS)) {
        writeCell(
          tef3071Sheet,
          `${TEF3071_WORK_TYPE_COLUMN}${row}`,
          tef3071Values[`workType.${id}`],
        );
      }
      for (const [id, row] of Object.entries(TEF3071_CHECKLIST_ROWS)) {
        writeCell(
          tef3071Sheet,
          `${TEF3071_CHECKLIST_COLUMN}${row}`,
          tef3071Values[`checklist.${id}`],
        );
      }
      for (const ramp of ["in", "out"] as const) {
        TEF3071_RAMP_POSITIONS.forEach((position, index) => {
          const row = TEF3071_RAMP_ROWS[ramp][index];
          for (const [columnId, column] of Object.entries(TEF3071_RAMP_COLUMNS)) {
            writeCell(
              tef3071Sheet,
              `${column}${row}`,
              tef3071Values[`ramp.${ramp}.${position}.${columnId}`],
            );
          }
        });
      }
    }

    const tef3207Values = site.sections["tef3207"] ?? {};
    const tef3207Sheet = sheetFor(
      workbook,
      { sheet: "TEF3207 SITE _", column: "A", row: 1 },
      site.number,
    );
    if (tef3207Sheet) {
      for (const [fieldId, ref] of Object.entries(TEF3207_CELLS)) {
        writeCell(tef3207Sheet, cellAddress(ref), tef3207Values[fieldId]);
      }
      for (const [groupId, cells] of Object.entries(TEF3207_TICK_CELLS)) {
        for (const [option, address] of Object.entries(cells)) {
          if (tef3207Values[`tick.${groupId}.${option}`] === true) {
            writeCell(tef3207Sheet, address, TEF3207_TICK_CHARACTER);
          }
        }
      }
      for (const [key, value] of Object.entries(tef3207Values)) {
        const match = /^condition\.(cwr|jointed)\.(\d+)$/.exec(key);
        if (!match || value !== true) continue;
        const column =
          match[1] === "cwr" ? TEF3207_CONDITION_CWR_COLUMN : TEF3207_CONDITION_JOINTED_COLUMN;
        const row = TEF3207_CONDITION_FIRST_ROW + Number(match[2]) - 1;
        writeCell(tef3207Sheet, `${column}${row}`, TEF3207_TICK_CHARACTER);
      }
    }
  }

  if (options.includeImages && options.media?.length) {
    await appendImages(workbook, options.media);
  }

  const output = await workbook.xlsx.writeBuffer();
  return Buffer.from(output);
}

/**
 * Images are placed on the worksheet that matches their section: photographs on
 * `TQS FORM` (which contains PHOTO placeholders) and trace / CCQ chart images
 * on their own worksheets.
 */
async function appendImages(
  workbook: ExcelJS.Workbook,
  media: NonNullable<ExcelExportOptions["media"]>,
): Promise<void> {
  const targets: Record<string, string> = {
    PHOTO: "TQS FORM",
    TRACE: "TRACE",
    CCQ_CHART: "CCQ CHART",
    DIAGRAM_PAGE: "DIAGRAM",
  };
  const rowCursor: Record<string, number> = {};
  for (const asset of media) {
    if (!asset.contentType.startsWith("image/")) continue;
    const sheetName = targets[asset.kind];
    const sheet = sheetName ? workbook.getWorksheet(sheetName) : undefined;
    if (!sheet) continue;
    const extension = asset.contentType === "image/png" ? "png" : "jpeg";
    const buffer = await getObject(asset.storageKey);
    const imageId = workbook.addImage({ buffer: new Uint8Array(buffer), extension });
    const startRow = rowCursor[sheetName] ?? (sheetName === "TQS FORM" ? 68 : 4);
    sheet.addImage(imageId, {
      tl: { col: 2, row: startRow },
      ext: { width: 320, height: 240 },
    });
    rowCursor[sheetName] = startRow + 16;
  }
}
