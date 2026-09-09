import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { SECTIONS } from "@/lib/config/sections";
import {
  TEF3071_CHECKLIST,
  TEF3071_WORK_TYPES,
  TEF3207_TICK_GROUPS,
} from "@/lib/config/fields";
import type { AnnotationShape } from "@/lib/domain/annotations";
import { deserialiseAnnotations } from "@/lib/domain/annotations";
import type { PackView } from "./packService";
import { getObject } from "./storage";

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 40;

export interface PdfMedia {
  id: string;
  kind: string;
  sectionId: string | null;
  fileName: string;
  contentType: string;
  storageKey: string;
  caption: string;
  pageNumber: number | null;
  siteNumber?: number;
  capturedAt?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  annotations?: unknown;
}

interface Writer {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  font: PDFFont;
  bold: PDFFont;
  packLabel: string;
  siteLabel: string;
}

function newPage(writer: Writer): void {
  writer.page = writer.doc.addPage([A4.width, A4.height]);
  writer.y = A4.height - MARGIN;
  writer.page.drawText(`${writer.packLabel}${writer.siteLabel ? ` - ${writer.siteLabel}` : ""}`, {
    x: MARGIN,
    y: A4.height - 26,
    size: 8,
    font: writer.font,
    color: rgb(0.35, 0.35, 0.35),
  });
  writer.y -= 12;
}

function ensureSpace(writer: Writer, needed: number): void {
  if (writer.y - needed < MARGIN + 24) newPage(writer);
}

function heading(writer: Writer, text: string, size = 14): void {
  ensureSpace(writer, size + 18);
  writer.y -= size + 6;
  writer.page.drawText(text, { x: MARGIN, y: writer.y, size, font: writer.bold });
  writer.y -= 6;
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function labelledValue(writer: Writer, label: string, value: string): void {
  const size = 9;
  const labelWidth = 190;
  const lines = wrap(value, writer.font, size, A4.width - MARGIN * 2 - labelWidth);
  ensureSpace(writer, lines.length * (size + 3) + 6);
  writer.page.drawText(label, { x: MARGIN, y: writer.y, size, font: writer.bold });
  lines.forEach((line, index) => {
    writer.page.drawText(line, {
      x: MARGIN + labelWidth,
      y: writer.y - index * (size + 3),
      size,
      font: writer.font,
    });
  });
  writer.y -= lines.length * (size + 3) + 4;
}

function formatValue(value: unknown): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

/**
 * Server-side PDF generation from the saved database state. The browser view is
 * never used as the source of the export.
 */
export async function buildPackPdf(pack: PackView, media: PdfMedia[]): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const writer: Writer = {
    doc,
    page: doc.addPage([A4.width, A4.height]),
    y: A4.height - MARGIN,
    font,
    bold,
    packLabel: `${pack.reference} - ${pack.title}`,
    siteLabel: "",
  };

  writer.page.drawText("Track Quality Pack", { x: MARGIN, y: writer.y, size: 20, font: bold });
  writer.y -= 30;
  labelledValue(writer, "Pack reference", pack.reference);
  labelledValue(writer, "Title", pack.title);
  labelledValue(writer, "Status", pack.status);
  labelledValue(writer, "Sites", String(pack.sites.length));

  heading(writer, "TQS Form");
  const tqs = SECTIONS.find((s) => s.id === "tqs-form");
  for (const group of tqs?.packGroups ?? []) {
    heading(writer, group.title, 11);
    for (const field of group.fields) {
      labelledValue(writer, field.label, formatValue(pack.packValues[field.id]));
    }
  }

  for (const site of pack.sites) {
    writer.siteLabel = `Site ${site.number}${site.name ? ` - ${site.name}` : ""}`;
    newPage(writer);
    heading(writer, writer.siteLabel, 16);

    for (const section of SECTIONS) {
      const values = site.sections[section.id] ?? {};
      if (section.kind !== "form") continue;
      if (!section.siteGroups?.length) continue;
      heading(writer, `${section.title} - ${writer.siteLabel}`);
      for (const group of section.siteGroups) {
        heading(writer, group.title, 11);
        for (const field of group.fields) {
          labelledValue(writer, field.label, formatValue(values[field.id]));
        }
      }
      if (section.id === "tef3071") {
        heading(writer, "Work undertaken", 11);
        for (const work of TEF3071_WORK_TYPES) {
          labelledValue(writer, work.label, formatValue(values[`workType.${work.id}`]));
        }
        heading(writer, "Post-work checklist", 11);
        for (const item of TEF3071_CHECKLIST) {
          labelledValue(writer, item.label, formatValue(values[`checklist.${item.id}`]));
        }
      }
      if (section.id === "tef3207") {
        for (const group of TEF3207_TICK_GROUPS) {
          const ticked = group.options.filter((option) => values[`tick.${group.id}.${option}`]);
          labelledValue(writer, group.title, ticked.length ? ticked.join(", ") : "-");
        }
      }
    }

    await appendMedia(
      writer,
      media.filter((item) => item.siteNumber === site.number),
    );
  }

  const packWideMedia = media.filter((item) => item.siteNumber === undefined);
  if (packWideMedia.length) {
    writer.siteLabel = "";
    newPage(writer);
    heading(writer, "Photographs, diagrams, traces and CCQ charts");
    await appendMedia(writer, packWideMedia);
  }

  addPageNumbers(doc, font);
  return Buffer.from(await doc.save());
}

async function appendMedia(writer: Writer, media: PdfMedia[]): Promise<void> {
  for (const item of media) {
    let bytes: Buffer;
    try {
      bytes = await getObject(item.storageKey);
    } catch {
      labelledValue(writer, item.fileName, "Attachment could not be read from storage");
      continue;
    }

    if (item.contentType === "application/pdf") {
      const source = await PDFDocument.load(bytes);
      const index = (item.pageNumber ?? 1) - 1;
      if (index < 0 || index >= source.getPageCount()) continue;
      const [copied] = await writer.doc.copyPages(source, [index]);
      writer.doc.addPage(copied);
      drawAnnotations(copied, deserialiseAnnotations(item.annotations ?? []));
      continue;
    }

    const image =
      item.contentType === "image/png"
        ? await writer.doc.embedPng(bytes)
        : await writer.doc.embedJpg(bytes);
    const maxWidth = A4.width - MARGIN * 2;
    const scale = Math.min(1, maxWidth / image.width, 420 / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    ensureSpace(writer, height + 40);
    writer.y -= height;
    writer.page.drawImage(image, { x: MARGIN, y: writer.y, width, height });
    drawAnnotations(
      writer.page,
      deserialiseAnnotations(item.annotations ?? []),
      { x: MARGIN, y: writer.y, width, height },
    );
    writer.y -= 14;
    const caption = [item.caption, item.capturedAt ? `Captured ${item.capturedAt}` : null]
      .filter(Boolean)
      .join(" - ");
    writer.page.drawText(caption || item.fileName, {
      x: MARGIN,
      y: writer.y,
      size: 8,
      font: writer.font,
    });
    writer.y -= 12;
  }
}

function drawAnnotations(
  page: PDFPage,
  shapes: AnnotationShape[],
  box?: { x: number; y: number; width: number; height: number },
): void {
  const area = box ?? { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() };
  for (const shape of shapes) {
    const colour = hexToRgb(shape.colour);
    const points = shape.points.map((point) => ({
      x: area.x + point.x * area.width,
      // Stored coordinates use a top-left origin; PDF uses bottom-left.
      y: area.y + (1 - point.y) * area.height,
    }));
    if (shape.tool === "text" && shape.text) {
      page.drawText(shape.text, {
        x: points[0].x,
        y: points[0].y,
        size: Math.max(8, shape.thickness * 4),
        color: colour,
      });
      continue;
    }
    if (shape.tool === "rectangle" && points.length >= 2) {
      const [start, end] = points;
      page.drawRectangle({
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        width: Math.abs(end.x - start.x),
        height: Math.abs(end.y - start.y),
        borderColor: colour,
        borderWidth: shape.thickness,
      });
      continue;
    }
    for (let i = 1; i < points.length; i += 1) {
      page.drawLine({
        start: points[i - 1],
        end: points[i],
        thickness: shape.thickness,
        color: colour,
        opacity: shape.tool === "highlight" ? 0.35 : 1,
      });
    }
  }
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  return rgb(
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  );
}

function addPageNumbers(doc: PDFDocument, font: PDFFont): void {
  const pages = doc.getPages();
  pages.forEach((page, index) => {
    page.drawText(`Page ${index + 1} of ${pages.length}`, {
      x: page.getWidth() - 120,
      y: 24,
      size: 8,
      font,
      color: rgb(0.35, 0.35, 0.35),
    });
  });
}
