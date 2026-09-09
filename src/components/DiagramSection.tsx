"use client";

import { useCallback, useEffect, useState } from "react";
import { AnnotationCanvas } from "./AnnotationCanvas";
import type { MediaItem } from "./MediaManager";

interface Props {
  packId: string;
  sites: { number: number; name: string }[];
  canEdit: boolean;
}

/**
 * Line diagram viewer. Pages are served individually by the server so a large
 * diagram can be browsed on a mobile device; selecting a page copies it into
 * the pack and leaves the source PDF unchanged.
 */
export function DiagramSection({ packId, sites, canEdit }: Props) {
  const [pageCount, setPageCount] = useState(0);
  const [fileName, setFileName] = useState("");
  const [selected, setSelected] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [siteNumber, setSiteNumber] = useState<number | undefined>(sites[0]?.number);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const [info, media] = await Promise.all([
      fetch("/api/diagram"),
      fetch(`/api/packs/${packId}/media?kind=DIAGRAM_PAGE`),
    ]);
    if (info.ok) {
      const data = (await info.json()) as { pageCount: number; fileName: string };
      setPageCount(data.pageCount);
      setFileName(data.fileName);
    } else {
      setStatus("The line diagram could not be opened");
    }
    if (media.ok) {
      const data = (await media.json()) as { media: MediaItem[] };
      setSelected(data.media);
    }
  }, [packId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function selectPage() {
    setStatus("Adding page...");
    const response = await fetch(`/api/packs/${packId}/diagram`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageNumber: page, siteNumber, caption: `Page ${page}` }),
    });
    setStatus(response.ok ? `Page ${page} added` : "The page could not be added");
    await load();
  }

  async function remove(item: MediaItem) {
    if (!window.confirm(`Remove diagram page ${item.pageNumber}?`)) return;
    await fetch(`/api/media/${item.id}`, { method: "DELETE" });
    await load();
  }

  return (
    <section className="flex flex-col gap-4" aria-label="Line diagram">
      <h2 className="text-lg font-semibold">Line diagram</h2>
      <p className="text-sm text-slate-600">
        {fileName} {pageCount ? `- ${pageCount} pages` : ""}
      </p>

      {canEdit ? (
        <div className="flex flex-wrap items-end gap-3 rounded-md border border-slate-300 bg-white p-3">
          <label className="text-sm font-semibold">
            Page
            <input
              type="number"
              min={1}
              max={Math.max(1, pageCount)}
              value={page}
              onChange={(event) => setPage(Number(event.target.value))}
              className="mt-1 block min-h-11 w-24 rounded-md border border-slate-400 px-3"
            />
          </label>
          <label className="text-sm font-semibold">
            Site
            <select
              className="mt-1 block min-h-11 rounded-md border border-slate-400 px-3"
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
          <button
            type="button"
            className="min-h-11 rounded-md bg-blue-700 px-4 text-white"
            onClick={() => void selectPage()}
          >
            Add page to pack
          </button>
          <span aria-live="polite" className="text-sm">
            {status}
          </span>
        </div>
      ) : null}

      {pageCount > 0 ? (
        <div className="rounded-md border border-slate-300 bg-white p-2">
          <h3 className="mb-2 text-sm font-semibold">Preview of page {page}</h3>
          <object
            data={`/api/diagram/pages/${page}`}
            type="application/pdf"
            className="h-[60vh] w-full"
            aria-label={`Line diagram page ${page}`}
          >
            <a href={`/api/diagram/pages/${page}`}>Open page {page}</a>
          </object>
        </div>
      ) : null}

      <h3 className="text-base font-semibold">Selected pages</h3>
      <ul className="grid gap-4 lg:grid-cols-2">
        {selected.map((item) => (
          <li key={item.id} className="rounded-md border border-slate-300 bg-white p-3">
            <p className="mb-2 text-sm font-medium">
              Page {item.pageNumber}
              {item.siteNumber ? ` - Site ${item.siteNumber}` : " - not site specific"}
            </p>
            <AnnotationCanvas mediaId={item.id} initialShapes={item.annotations} readOnly={!canEdit}>
              <object
                data={`/api/media/${item.id}/content`}
                type="application/pdf"
                className="pointer-events-none h-[50vh] w-full"
                aria-label={`Selected diagram page ${item.pageNumber}`}
              />
            </AnnotationCanvas>
            {canEdit ? (
              <button
                type="button"
                className="mt-2 min-h-11 rounded-md border border-red-600 px-3 text-sm text-red-700"
                onClick={() => void remove(item)}
              >
                Remove page
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
