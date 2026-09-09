"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NavEntry } from "@/lib/config/sections";
import type { ValidationIssue } from "@/lib/domain/validation";

interface Props {
  packId: string;
  reference: string;
  title: string;
  status: string;
  navigation: NavEntry[];
  activeHref: string;
  currentSite?: { number: number; name: string };
  issues: ValidationIssue[];
  canReview: boolean;
  children: React.ReactNode;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "In progress",
  READY_FOR_REVIEW: "Ready for review",
  COMPLETE: "Complete",
  ARCHIVED: "Archived",
};

/** Application shell: header, navigation, status, exports and validation. */
export function PackShell({
  packId,
  reference,
  title,
  status,
  navigation,
  activeHref,
  currentSite,
  issues,
  canReview,
  children,
}: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [message, setMessage] = useState("");

  const index = navigation.findIndex((entry) => entry.href === activeHref);
  const previous = index > 0 ? navigation[index - 1] : undefined;
  const next = index >= 0 && index < navigation.length - 1 ? navigation[index + 1] : undefined;

  async function changeStatus(nextStatus: string) {
    setMessage("Updating status...");
    const response = await fetch(`/api/packs/${packId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setMessage(response.ok ? `Status set to ${STATUS_LABELS[nextStatus]}` : (body.error ?? "Failed"));
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-300 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wide text-slate-600">Track Quality Pack</p>
            <h1 className="text-lg font-bold">
              {reference} - {title}
            </h1>
            {currentSite ? (
              <p className="text-sm text-blue-800">
                Site {currentSite.number}
                {currentSite.name ? ` - ${currentSite.name}` : ""}
              </p>
            ) : null}
          </div>

          <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-medium">
            {STATUS_LABELS[status] ?? status}
          </span>

          <div className="flex items-center gap-2">
            <details className="relative">
              <summary className="min-h-11 cursor-pointer list-none rounded-md border border-slate-400 px-3 py-2 text-sm">
                Export
              </summary>
              <div className="absolute right-0 z-40 mt-1 flex w-48 flex-col rounded-md border border-slate-300 bg-white p-2 shadow">
                <a className="min-h-11 px-2 py-2 text-sm" href={`/api/packs/${packId}/export/excel`}>
                  Download Excel
                </a>
                <a className="min-h-11 px-2 py-2 text-sm" href={`/api/packs/${packId}/export/pdf`}>
                  Download PDF
                </a>
              </div>
            </details>

            <button
              type="button"
              className="min-h-11 rounded-md border border-slate-400 px-3 text-sm lg:hidden"
              aria-expanded={menuOpen}
              aria-controls="section-navigation"
              onClick={() => setMenuOpen((open) => !open)}
            >
              Sections
            </button>
          </div>
        </div>

        <nav
          id="section-navigation"
          aria-label="Pack sections"
          className={`${menuOpen ? "block" : "hidden"} border-t border-slate-200 lg:block`}
        >
          <ul className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-2 lg:flex-row lg:flex-wrap">
            {navigation.map((entry) => (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={entry.href === activeHref ? "page" : undefined}
                  className={`block min-h-11 rounded-md px-3 py-2 text-sm ${
                    entry.href === activeHref
                      ? "bg-blue-700 text-white"
                      : "bg-slate-100 hover:bg-slate-200"
                  }`}
                >
                  {entry.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4">
        {issues.length > 0 ? (
          <section
            aria-label="Validation summary"
            className="rounded-md border border-amber-500 bg-amber-50 p-3"
          >
            <h2 className="font-semibold">Validation summary ({issues.length})</h2>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {issues.slice(0, 12).map((issue, position) => (
                <li key={`${issue.sectionId}-${issue.fieldId}-${position}`}>
                  {issue.sectionId}
                  {issue.siteNumber ? ` (site ${issue.siteNumber})` : ""}: {issue.message}
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="rounded-md border border-green-600 bg-green-50 p-3 text-sm">
            No outstanding validation issues.
          </p>
        )}

        {children}

        <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Section paging">
          {previous ? (
            <Link className="min-h-11 rounded-md border border-slate-400 px-4 py-2" href={previous.href}>
              Previous: {previous.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link className="min-h-11 rounded-md border border-slate-400 px-4 py-2" href={next.href}>
              Next: {next.title}
            </Link>
          ) : null}
        </nav>

        <section aria-label="Pack workflow" className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="min-h-11 rounded-md border border-slate-400 px-4"
            onClick={() => void changeStatus("READY_FOR_REVIEW")}
          >
            Mark ready for review
          </button>
          {canReview ? (
            <>
              <button
                type="button"
                className="min-h-11 rounded-md border border-slate-400 px-4"
                onClick={() => void changeStatus("COMPLETE")}
              >
                Mark complete
              </button>
              <button
                type="button"
                className="min-h-11 rounded-md border border-slate-400 px-4"
                onClick={() => {
                  if (window.confirm("Archive this pack?")) void changeStatus("ARCHIVED");
                }}
              >
                Archive
              </button>
            </>
          ) : null}
          <span aria-live="polite" className="text-sm">
            {message}
          </span>
        </section>
      </main>
    </div>
  );
}
