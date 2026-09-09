"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  packId: string;
  sites: { number: number; name: string }[];
  canEdit: boolean;
}

/**
 * Number of sites and site names, entered in the Track Details area of the TQS
 * Form. Reducing the count never deletes data silently: the server reports the
 * sites holding information and deletion must be confirmed explicitly.
 */
export function SiteManager({ packId, sites, canEdit }: Props) {
  const router = useRouter();
  const [count, setCount] = useState(Math.max(1, sites.length));
  const [names, setNames] = useState<Record<string, string>>(
    Object.fromEntries(sites.map((site) => [String(site.number), site.name])),
  );
  const [status, setStatus] = useState("");
  const [pendingDeletion, setPendingDeletion] = useState<number[] | null>(null);

  async function apply(confirmDeletion = false) {
    setStatus("Updating sites...");
    const response = await fetch(`/api/packs/${packId}/sites`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count, confirmDeletion, names }),
    });
    const body = (await response.json()) as {
      requiresConfirmation?: number[];
      error?: string;
    };
    if (response.status === 409 && body.requiresConfirmation?.length) {
      setPendingDeletion(body.requiresConfirmation);
      setStatus("");
      return;
    }
    if (!response.ok) {
      setStatus(body.error ?? "Sites could not be updated");
      return;
    }
    setPendingDeletion(null);
    setStatus("Sites updated");
    router.refresh();
  }

  return (
    <section className="rounded-md border border-slate-300 bg-white p-4" aria-label="Sites">
      <h2 className="text-base font-semibold">Sites</h2>
      <p className="mt-1 text-sm text-slate-600">
        One instance of every site-specific section is created for each site.
      </p>

      <label className="mt-3 block text-sm font-semibold">
        Number of sites
        <input
          type="number"
          min={1}
          max={50}
          className="mt-1 block min-h-11 w-32 rounded-md border border-slate-400 px-3"
          value={count}
          disabled={!canEdit}
          onChange={(event) => setCount(Number(event.target.value))}
        />
      </label>

      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {sites.map((site) => (
          <li key={site.number}>
            <label className="block text-sm font-semibold">
              Site {site.number} name
              <input
                className="mt-1 block min-h-11 w-full rounded-md border border-slate-400 px-3"
                value={names[String(site.number)] ?? ""}
                disabled={!canEdit}
                onChange={(event) =>
                  setNames({ ...names, [String(site.number)]: event.target.value })
                }
              />
            </label>
          </li>
        ))}
      </ul>

      {pendingDeletion ? (
        <div role="alert" className="mt-3 rounded-md border border-red-600 bg-red-50 p-3 text-sm">
          <p>
            Site{pendingDeletion.length > 1 ? "s" : ""} {pendingDeletion.join(", ")} still contain
            information. Confirm that you want to delete the site data before continuing.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="min-h-11 rounded-md bg-red-700 px-4 text-white"
              onClick={() => void apply(true)}
            >
              Delete site data
            </button>
            <button
              type="button"
              className="min-h-11 rounded-md border border-slate-400 px-4"
              onClick={() => setPendingDeletion(null)}
            >
              Keep sites
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="mt-3 min-h-11 rounded-md bg-blue-700 px-4 text-white disabled:bg-slate-400"
        disabled={!canEdit}
        onClick={() => void apply(false)}
      >
        Apply site changes
      </button>
      <p className="mt-2 text-sm" aria-live="polite">
        {status}
      </p>
    </section>
  );
}
