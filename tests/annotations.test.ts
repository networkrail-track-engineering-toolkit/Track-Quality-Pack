import { describe, expect, it } from "vitest";
import {
  annotationDocumentSchema,
  deserialiseAnnotations,
  serialiseAnnotations,
  toNormalised,
  toPixels,
  type AnnotationShape,
} from "@/lib/domain/annotations";

const shape: AnnotationShape = {
  id: "shape-1",
  tool: "arrow",
  page: 2,
  colour: "#d32f2f",
  thickness: 3,
  points: [
    { x: 0.1, y: 0.2 },
    { x: 0.6, y: 0.8 },
  ],
};

describe("annotations", () => {
  it("round-trips through serialisation", () => {
    const restored = deserialiseAnnotations(serialiseAnnotations([shape]));
    expect(restored).toEqual([shape]);
  });

  it("accepts stored JSON objects as well as strings", () => {
    expect(deserialiseAnnotations([shape])).toEqual([shape]);
    expect(deserialiseAnnotations(null)).toEqual([]);
  });

  it("rejects malformed overlays", () => {
    expect(() => annotationDocumentSchema.parse([{ ...shape, colour: "red" }])).toThrow();
    expect(() => annotationDocumentSchema.parse([{ ...shape, tool: "spray" }])).toThrow();
  });

  it("keeps coordinates aligned across viewport sizes", () => {
    const phone = toPixels(shape, 390, 700);
    const laptop = toPixels(shape, 1440, 900);
    expect(toNormalised(phone, 390, 700)).toEqual(shape.points);
    expect(toNormalised(laptop, 1440, 900)[1].x).toBeCloseTo(0.6, 10);
  });
});
