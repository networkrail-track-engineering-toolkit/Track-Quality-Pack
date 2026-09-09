import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { apiError } from "@/lib/server/apiError";
import { getSessionUser } from "@/lib/server/auth";
import { readTemplate } from "@/lib/server/storage";
import { DIAGRAM_TEMPLATE } from "@/lib/config/templates";

export const runtime = "nodejs";

export async function GET() {
  try {
    await getSessionUser();
    const document = await PDFDocument.load(await readTemplate(DIAGRAM_TEMPLATE), {
      updateMetadata: false,
    });
    return NextResponse.json({
      fileName: DIAGRAM_TEMPLATE,
      pageCount: document.getPageCount(),
    });
  } catch (error) {
    return apiError(error);
  }
}
