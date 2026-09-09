import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { apiError } from "@/lib/server/apiError";
import { getSessionUser } from "@/lib/server/auth";
import { readTemplate } from "@/lib/server/storage";
import { DIAGRAM_TEMPLATE } from "@/lib/config/templates";

export const runtime = "nodejs";

/**
 * Serves a single page of the line diagram as a standalone PDF so pages can be
 * previewed and selected without loading the whole document on a mobile device.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pageNumber: string }> },
) {
  try {
    await getSessionUser();
    const { pageNumber } = await params;
    const index = Number(pageNumber) - 1;
    if (!Number.isInteger(index) || index < 0) {
      return NextResponse.json({ error: "Invalid page number" }, { status: 400 });
    }
    const source = await PDFDocument.load(await readTemplate(DIAGRAM_TEMPLATE), {
      updateMetadata: false,
    });
    if (index >= source.getPageCount()) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }
    const output = await PDFDocument.create();
    const [page] = await output.copyPages(source, [index]);
    output.addPage(page);
    const bytes = await output.save();
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="diagram-page-${index + 1}.pdf"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
