"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AnnotationShape, AnnotationTool } from "@/lib/domain/annotations";

const TOOLS: { id: AnnotationTool; label: string }[] = [
  { id: "freehand", label: "Freehand" },
  { id: "line", label: "Line" },
  { id: "arrow", label: "Arrow" },
  { id: "rectangle", label: "Rectangle" },
  { id: "text", label: "Text box" },
  { id: "highlight", label: "Highlight" },
];

const COLOURS = ["#d32f2f", "#1565c0", "#2e7d32", "#f9a825", "#111111"];

interface Props {
  mediaId: string;
  /** Media rendered underneath the annotation overlay. */
  children: React.ReactNode;
  initialShapes: AnnotationShape[];
  page?: number;
  readOnly?: boolean;
  onSaved?: (shapes: AnnotationShape[]) => void;
}

/**
 * Shared annotation surface used by the Diagram, Trace and CCQ Chart sections.
 * Shapes are stored as normalised coordinates so they stay aligned when the
 * media is resized, rotated or displayed on another device.
 */
export function AnnotationCanvas({
  mediaId,
  children,
  initialShapes,
  page = 1,
  readOnly = false,
  onSaved,
}: Props) {
  const surface = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [shapes, setShapes] = useState<AnnotationShape[]>(initialShapes);
  const [redoStack, setRedoStack] = useState<AnnotationShape[]>([]);
  const canRedo = redoStack.length > 0;
  const [tool, setTool] = useState<AnnotationTool>("freehand");
  const [colour, setColour] = useState(COLOURS[0]);
  const [thickness, setThickness] = useState(3);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [drawing, setDrawing] = useState<AnnotationShape | null>(null);
  const [status, setStatus] = useState<string>("");

  const draw = useCallback(() => {
    const element = canvas.current;
    const box = surface.current;
    if (!element || !box) return;
    const { width, height } = box.getBoundingClientRect();
    element.width = width;
    element.height = height;
    const context = element.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, width, height);
    for (const shape of [...shapes, ...(drawing ? [drawing] : [])]) {
      if (shape.page !== page) continue;
      const points = shape.points.map((point) => ({ x: point.x * width, y: point.y * height }));
      context.strokeStyle = shape.colour;
      context.fillStyle = shape.colour;
      context.lineWidth = shape.thickness;
      context.globalAlpha = shape.tool === "highlight" ? 0.35 : 1;
      context.lineCap = "round";
      if (shape.tool === "text") {
        context.font = `${Math.max(12, shape.thickness * 5)}px sans-serif`;
        context.fillText(shape.text ?? "", points[0].x, points[0].y);
      } else if (shape.tool === "rectangle" && points.length >= 2) {
        context.strokeRect(
          points[0].x,
          points[0].y,
          points[1].x - points[0].x,
          points[1].y - points[0].y,
        );
      } else if (points.length >= 2) {
        context.beginPath();
        context.moveTo(points[0].x, points[0].y);
        for (const point of points.slice(1)) context.lineTo(point.x, point.y);
        context.stroke();
        if (shape.tool === "arrow") {
          const end = points[points.length - 1];
          const start = points[points.length - 2];
          const angle = Math.atan2(end.y - start.y, end.x - start.x);
          const size = 8 + shape.thickness * 2;
          context.beginPath();
          context.moveTo(end.x, end.y);
          context.lineTo(
            end.x - size * Math.cos(angle - Math.PI / 6),
            end.y - size * Math.sin(angle - Math.PI / 6),
          );
          context.lineTo(
            end.x - size * Math.cos(angle + Math.PI / 6),
            end.y - size * Math.sin(angle + Math.PI / 6),
          );
          context.closePath();
          context.fill();
        }
      }
      context.globalAlpha = 1;
    }
  }, [drawing, page, shapes]);

  useEffect(() => {
    draw();
    const observer = new ResizeObserver(() => draw());
    if (surface.current) observer.observe(surface.current);
    return () => observer.disconnect();
  }, [draw]);

  function positionOf(event: React.PointerEvent): { x: number; y: number } {
    const box = surface.current?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };
    return {
      x: (event.clientX - box.left) / box.width,
      y: (event.clientY - box.top) / box.height,
    };
  }

  function start(event: React.PointerEvent) {
    if (readOnly) return;
    const point = positionOf(event);
    if (tool === "text") {
      const text = window.prompt("Annotation text");
      if (!text) return;
      pushShape({
        id: crypto.randomUUID(),
        tool,
        page,
        colour,
        thickness,
        points: [point],
        text,
      });
      return;
    }
    setDrawing({ id: crypto.randomUUID(), tool, page, colour, thickness, points: [point] });
  }

  function move(event: React.PointerEvent) {
    if (!drawing) return;
    const point = positionOf(event);
    setDrawing((current) => {
      if (!current) return current;
      if (current.tool === "freehand" || current.tool === "highlight") {
        return { ...current, points: [...current.points, point] };
      }
      return { ...current, points: [current.points[0], point] };
    });
  }

  function end() {
    if (!drawing) return;
    if (drawing.points.length >= 2 || drawing.tool === "text") pushShape(drawing);
    setDrawing(null);
  }

  function pushShape(shape: AnnotationShape) {
    setShapes((current) => [...current, shape]);
    setRedoStack([]);
  }

  function undo() {
    setShapes((current) => {
      if (current.length === 0) return current;
      const last = current[current.length - 1];
      setRedoStack((stack) => [...stack, last]);
      return current.slice(0, -1);
    });
  }

  function redo() {
    setRedoStack((stack) => {
      if (stack.length === 0) return stack;
      const last = stack[stack.length - 1];
      setShapes((current) => [...current, last]);
      return stack.slice(0, -1);
    });
  }

  function deleteLastOnPage() {
    setShapes((current) => {
      const index = [...current].reverse().findIndex((shape) => shape.page === page);
      if (index === -1) return current;
      const target = current.length - 1 - index;
      return current.filter((_, i) => i !== target);
    });
  }

  function clearAll() {
    if (!window.confirm("Remove every annotation from this item?")) return;
    setShapes([]);
    setRedoStack([]);
  }

  async function save() {
    setStatus("Saving annotations...");
    const response = await fetch(`/api/media/${mediaId}/annotations`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shapes }),
    });
    setStatus(response.ok ? "Annotations saved" : "Annotations could not be saved");
    if (response.ok) onSaved?.(shapes);
  }

  return (
    <div className="flex flex-col gap-2">
      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Annotation tools">
          {TOOLS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTool(item.id)}
              aria-pressed={tool === item.id}
              className={`min-h-11 rounded-md border px-3 text-sm ${
                tool === item.id ? "border-blue-700 bg-blue-700 text-white" : "border-slate-400 bg-white"
              }`}
            >
              {item.label}
            </button>
          ))}
          <label className="text-sm">
            <span className="sr-only">Colour</span>
            <select
              className="min-h-11 rounded-md border border-slate-400 px-2"
              value={colour}
              onChange={(event) => setColour(event.target.value)}
            >
              {COLOURS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Thickness
            <input
              type="range"
              min={1}
              max={12}
              value={thickness}
              onChange={(event) => setThickness(Number(event.target.value))}
              className="ml-2 align-middle"
            />
          </label>
          <button type="button" className="min-h-11 rounded-md border border-slate-400 px-3 text-sm" onClick={undo}>
            Undo
          </button>
          <button
            type="button"
            className="min-h-11 rounded-md border border-slate-400 px-3 text-sm"
            onClick={redo}
            disabled={!canRedo}
          >
            Redo
          </button>
          <button
            type="button"
            className="min-h-11 rounded-md border border-slate-400 px-3 text-sm"
            onClick={deleteLastOnPage}
          >
            Delete last
          </button>
          <button type="button" className="min-h-11 rounded-md border border-red-600 px-3 text-sm text-red-700" onClick={clearAll}>
            Clear all
          </button>
          <button type="button" className="min-h-11 rounded-md bg-blue-700 px-3 text-sm text-white" onClick={() => void save()}>
            Save annotations
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button type="button" className="min-h-11 rounded-md border border-slate-400 px-3" onClick={() => setZoom((z) => Math.min(4, z + 0.25))}>
          Zoom in
        </button>
        <button type="button" className="min-h-11 rounded-md border border-slate-400 px-3" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>
          Zoom out
        </button>
        <button type="button" className="min-h-11 rounded-md border border-slate-400 px-3" onClick={() => setRotation((r) => (r + 90) % 360)}>
          Rotate
        </button>
        <span aria-live="polite">{status}</span>
      </div>

      <div className="max-w-full overflow-auto rounded-md border border-slate-300 bg-slate-50 p-2">
        <div
          ref={surface}
          className="relative mx-auto w-full touch-none"
          style={{ transform: `rotate(${rotation}deg) scale(${zoom})`, transformOrigin: "center" }}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        >
          {children}
          <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
        </div>
      </div>
    </div>
  );
}
