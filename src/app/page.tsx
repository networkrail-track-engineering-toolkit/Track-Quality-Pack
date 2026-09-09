"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface PackSummary {
  id: string;
  reference: string;
  title: string;
  status: string;
  updatedAt: string;
  _count: { sites: number };
}

export default function HomePage() {
  const router = useRouter();
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [reference, setReference] = useState("");
  const [title, setTitle] = useState("");
  const [siteCount, setSiteCount] = useState(1);
  const [status, setStatus] = useState("");

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/packs");
      if (!response.ok) {
        setStatus("Track Quality Packs could not be loaded. Check the database configuration.");
        return;
      }
      const data = (await response.json()) as { packs: PackSummary[] };
      setPacks(data.packs);
    })();
  }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setStatus("Creating pack...");
    const response = await fetch("/api/packs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference, title, siteCount }),
    });
    const body = (await response.json().catch(() => ({}))) as { id?: string; error?: string };
    if (!response.ok || !body.id) {
      setStatus(body.error ?? "The pack could not be created");
      return;
    }
    router.push(`/packs/${body.id}/tqs-form`);
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-4">
      <header>
        <h1 className="text-2xl font-bold">Track Quality Pack</h1>
        <p className="text-sm text-slate-600">
          Digital Track Quality Pack for laptops, iPads and iPhones.
        </p>
      </header>

      <section className="rounded-md border border-slate-300 bg-white p-4">
        <h2 className="text-lg font-semibold">Create a new pack</h2>
        <form className="mt-3 grid gap-3 sm:grid-cols-3" onSubmit={create}>
          <label className="text-sm font-semibold">
            Pack reference
            <input
              required
              className="mt-1 block min-h-11 w-full rounded-md border border-slate-400 px-3"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
          </label>
          <label className="text-sm font-semibold">
            Work description
            <input
              required
              className="mt-1 block min-h-11 w-full rounded-md border border-slate-400 px-3"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="text-sm font-semibold">
            Number of sites
            <input
              type="number"
              min={1}
              max={50}
              className="mt-1 block min-h-11 w-full rounded-md border border-slate-400 px-3"
              value={siteCount}
              onChange={(event) => setSiteCount(Number(event.target.value))}
            />
          </label>
          <button type="submit" className="min-h-11 rounded-md bg-blue-700 px-4 text-white">
            Create pack
          </button>
        </form>
        <p aria-live="polite" className="mt-2 text-sm">
          {status}
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Existing packs</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {packs.map((pack) => (
            <li key={pack.id} className="rounded-md border border-slate-300 bg-white p-3">
              <Link className="font-semibold text-blue-800" href={`/packs/${pack.id}/tqs-form`}>
                {pack.reference} - {pack.title}
              </Link>
              <p className="text-sm text-slate-600">
                {pack.status} · {pack._count.sites} site(s) · updated{" "}
                {new Date(pack.updatedAt).toLocaleString("en-GB")}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
