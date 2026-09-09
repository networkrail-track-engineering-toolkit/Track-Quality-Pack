import { z } from "zod";

/**
 * Annotation overlay model shared by the Diagram, Trace and CCQ Chart
 * sections. Coordinates are normalised to the 0-1 range relative to the
 * displayed media so that annotations stay aligned at any screen size,
 * orientation or device pixel ratio.
 */

export const annotationToolSchema = z.enum([
  "freehand",
  "line",
  "arrow",
  "rectangle",
  "text",
  "highlight",
]);
export type AnnotationTool = z.infer<typeof annotationToolSchema>;

export const pointSchema = z.object({ x: z.number().min(-1).max(2), y: z.number().min(-1).max(2) });

export const annotationShapeSchema = z.object({
  id: z.string().min(1).max(64),
  tool: annotationToolSchema,
  page: z.number().int().min(1).default(1),
  colour: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Colour must be a hex value such as #ff0000"),
  thickness: z.number().min(0.5).max(24),
  points: z.array(pointSchema).min(1).max(4000),
  text: z.string().max(500).optional(),
});
export type AnnotationShape = z.infer<typeof annotationShapeSchema>;

export const annotationDocumentSchema = z.array(annotationShapeSchema).max(500);
export type AnnotationDocument = AnnotationShape[];

export function serialiseAnnotations(shapes: AnnotationDocument): string {
  return JSON.stringify(annotationDocumentSchema.parse(shapes));
}

export function deserialiseAnnotations(raw: unknown): AnnotationDocument {
  if (raw === null || raw === undefined) return [];
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  return annotationDocumentSchema.parse(parsed);
}

/** Convert a normalised shape into pixel coordinates for a given viewport. */
export function toPixels(
  shape: AnnotationShape,
  width: number,
  height: number,
): { x: number; y: number }[] {
  return shape.points.map((point) => ({ x: point.x * width, y: point.y * height }));
}

/** Convert pixel coordinates back into the stored normalised form. */
export function toNormalised(
  points: { x: number; y: number }[],
  width: number,
  height: number,
): { x: number; y: number }[] {
  if (width <= 0 || height <= 0) return points.map(() => ({ x: 0, y: 0 }));
  return points.map((point) => ({ x: point.x / width, y: point.y / height }));
}
