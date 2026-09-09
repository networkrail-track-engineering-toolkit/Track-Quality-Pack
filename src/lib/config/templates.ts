/** Source documents supplied with the repository. */
export const WORKBOOK_TEMPLATE = "TRACK QUALITY PACK.xlsx";

/** Line diagram PDF. Override with the DIAGRAM_PDF environment variable. */
export const DIAGRAM_TEMPLATE = process.env.DIAGRAM_PDF ?? "IMDM Doncaster.pdf";
