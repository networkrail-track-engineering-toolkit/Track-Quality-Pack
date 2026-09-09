"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnnotationCanvas } from "./AnnotationCanvas";
import type { AnnotationShape } from "@/lib/domain/annotations";

export interface MediaItem {
  id: string;
  kind: string;
  fileName: string;
  contentType: string;
  caption: string;
  sortOrder: number;
  pageNumber: number | null;
  capturedAt: string | null;
  siteNumber?: number;
  hasLocation: boolean;
  latitude: number | null;
  longitude: number | null;
  gpsAccuracy: number | null;
  annotations: AnnotationShape[];
}

interface Props {
  packId: string;
  kind: "PHOTO" | "TRACE" | "CCQ_CHART";
  sectionId: string;
  sites: { number: number; name: string }[];
  currentSite?: number;
  canEdit: boolean;
  allowAnnotation?: boolean;
  title: string;
}

interface PendingLocation {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  message: string;
}

/**
 * Upload, camera capture, captioning, site association, ordering, annotation
 * and deletion of photographs, trace images and CCQ charts.
 */
export function MediaManager({
  packId,
  kind,
  sectionId,
  sites,
  currentSite,
  canEdit,
  allowAnnotation = true,
  title,
}: Props) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const [caption, setCaption] = useState("");
  const [siteNumber, setSiteNumber] = useState<number | undefined>(currentSite);
  const [location, setLocation] = useState<PendingLocation>({ message: "Location not requested" });
  const [fullSize, setFullSize] = useState<MediaItem | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/packs/${packId}/media?kind=${kind}`);
    if (!response.ok) {
      setStatus("Saved items could not be loaded");
      return;
    }
    const data = (await response.json()) as { media: MediaItem[] };
    setItems(data.media);
  }, [kind, packId]);

  useEffect(() => {
    void load();
  }, [load]);

  function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPreview({ file, url: URL.createObjectURL(file) });
    requestLocation();
  }

  /**
   * Location is optional: capture never depends on the permission being
   * granted, and coordinates are stored separately from the image file.
   */
  function requestLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocation({ message: "Location services are not available on this device" });
      return;
    }
    setLocation({ message: "Requesting location permission..." });
    navigator.geolocation.getCurrentPosition(
      (position) =>
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          message: `Location recorded (±${Math.round(position.coords.accuracy)} m)`,
        }),
      () => setLocation({ message: "Location not recorded - the photograph will still be saved" }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  async function upload() {
    if (!preview) return;
    setStatus("Uploading...");
    const form = new FormData();
    form.set("file", preview.file);
    form.set("kind", kind);
    form.set("sectionId", sectionId);
    form.set("caption", caption);
    form.set("capturedAt", new Date().toISOString());
    if (siteNumber) form.set("siteNumber", String(siteNumber));
    if (location.latitude !== undefined && location.longitude !== undefined) {
      form.set("latitude", String(location.latitude));
      form.set("longitude", String(location.longitude));
      if (location.accuracy !== undefined) form.set("gpsAccuracy", String(location.accuracy));
    }
    const response = await fetch(`/api/packs/${packId}/media`, { method: "POST", body: form });
    if (!response.ok) {
      setStatus("Upload failed - the item is still held on this device, try again");
      return;
    }
    URL.revokeObjectURL(preview.url);
    setPreview(null);
    setCaption("");
    setStatus("Uploaded");
    if (fileInput.current) fileInput.current.value = "";
    await load();
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const response = await fetch(`/api/media/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) setStatus("Change could not be saved");
    await load();
  }

  async function remove(item: MediaItem) {
    if (!window.confirm(`Delete ${item.fileName}? This cannot be undone.`)) return;
    const response = await fetch(`/api/media/${item.id}`, { method: "DELETE" });
    setStatus(response.ok ? "Deleted" : "Delete failed");
    await load();
  }

  async function reorder(item: MediaItem, direction: -1 | 1) {
    const target = items.find((_, index) => items[index].id === item.id);
    if (!target) return;
    await patch(item.id, { sortOrder: Math.max(0, item.sortOrder + direction) });
  }

  return (
    <section className="flex flex-col gap-4" aria-label={title}>
      <h2 className="text-lg font-semibold">{title}</h2>

      {canEdit ? (
        <div className="rounded-md border border-slate-300 bg-white p-3">
          <label className="text-sm font-semibold" htmlFor={`upload-${kind}`}>
            Take a photograph or choose an image
          </label>
          <input
            id={`upload-${kind}`}
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={choose}
            className="mt-2 block w-full text-sm"
          />
          <p className="mt-1 text-xs text-slate-600">
            On a phone or tablet this opens the camera. On a laptop it opens the normal file
            picker.
          </p>

          {preview ? (
            <div className="mt-3 flex flex-col gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.url} alt="Preview of the selected image" className="max-h-64 w-auto rounded" />
              <label className="text-sm font-semibold" htmlFor={`caption-${kind}`}>
                Caption or description
              </label>
              <input
                id={`caption-${kind}`}
                className="min-h-11 rounded-md border border-slate-400 px-3"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
              />
              {sites.length > 0 ? (
                <label className="text-sm font-semibold">
                  Site
                  <select
                    className="mt-1 block min-h-11 w-full rounded-md border border-slate-400 px-3"
                    value={siteNumber ?? ""}
                    onChange={(event) =>
                      setSiteNumber(event.target.value ? Number(event.target.value) : undefined)
                    }
                  >
                    <option value="">Not site specific</option>
                    {sites.map((site) => (
                      <option key={site.number} value={site.number}>
                        Site {site.number}
                        {site.name ? ` - ${site.name}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <p className="text-xs text-slate-600" aria-live="polite">
                {location.message}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="min-h-11 rounded-md bg-blue-700 px-4 text-white"
                  onClick={() => void upload()}
                >
                  Save item
                </button>
                <button
                  type="button"
                  className="min-h-11 rounded-md border border-slate-400 px-4"
                  onClick={() => {
                    URL.revokeObjectURL(preview.url);
                    setPreview(null);
                  }}
                >
                  Discard
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <p aria-live="polite" className="text-sm text-slate-700">
        {status}
      </p>

      <ul className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-md border border-slate-300 bg-white p-3">
            <div className="flex flex-col gap-2">
              {allowAnnotation ? (
                <AnnotationCanvas
                  mediaId={item.id}
                  initialShapes={item.annotations}
                  readOnly={!canEdit}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/media/${item.id}/content`}
                    alt={item.caption || item.fileName}
                    className="w-full select-none"
                    draggable={false}
                  />
                </AnnotationCanvas>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/media/${item.id}/content`}
                  alt={item.caption || item.fileName}
                  className="w-full"
                />
              )}

              <p className="text-sm font-medium">{item.caption || item.fileName}</p>
              <p className="text-xs text-slate-600">
                {item.capturedAt ? new Date(item.capturedAt).toLocaleString("en-GB") : "No capture time"}
                {" · "}
                {item.siteNumber ? `Site ${item.siteNumber}` : "Not site specific"}
                {" · "}
                {item.hasLocation ? "Location recorded" : "No location"}
              </p>

              {canEdit ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="min-h-11 rounded-md border border-slate-400 px-3 text-sm"
                    onClick={() => setFullSize(item)}
                  >
                    View full size
                  </button>
                  <button
                    type="button"
                    className="min-h-11 rounded-md border border-slate-400 px-3 text-sm"
                    onClick={() => void reorder(item, -1)}
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    className="min-h-11 rounded-md border border-slate-400 px-3 text-sm"
                    onClick={() => void reorder(item, 1)}
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    className="min-h-11 rounded-md border border-red-600 px-3 text-sm text-red-700"
                    onClick={() => void remove(item)}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {fullSize ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Full size image"
          className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4"
        >
          <button
            type="button"
            className="self-end min-h-11 rounded-md bg-white px-4"
            onClick={() => setFullSize(null)}
          >
            Close
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/media/${fullSize.id}/content`}
            alt={fullSize.caption || fullSize.fileName}
            className="m-auto max-h-full max-w-full object-contain"
          />
        </div>
      ) : null}
    </section>
  );
}
