"use client";

import { useEffect, useState } from "react";

type CronJob = { id: string; name?: string; enabled?: boolean };
type SystemStatus = {
  gateway?: { ok?: boolean; summary?: string };
  cron?: { ok?: boolean; stale?: boolean; lastGoodAt?: number | null; jobs?: CronJob[] };
  status?: { ok?: boolean; note?: string };
};

export default function AgentAutomationsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SystemStatus>({});

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const r = await fetch("/api/control-center/system-status", { cache: "no-store" });
        const json = r.ok ? await r.json() : {};
        if (!cancelled) setData(json || {});
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    const id = setInterval(() => void run(), 10000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const jobs = data.cron?.jobs ?? [];
  const stale = Boolean(data.cron?.stale);

  return (
    <main className="text-white space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Agent Automations</h1>
        <p className="text-white/60 mt-1">Cron dan heartbeat monitor.</p>
      </div>

      <section className="rounded-xl border border-border bg-surface-card p-4 space-y-2">
        <h2 className="font-semibold">System Status</h2>
        {loading ? (
          <p className="text-white/60 text-sm">Memuat data...</p>
        ) : (
          <>
            <p className="text-sm text-white/80">Gateway: {data.gateway?.ok ? "Healthy" : "Unknown/Unhealthy"}</p>
            <p className="text-sm text-white/80">OpenClaw status: {data.status?.ok ? "Available" : "Unavailable (non-blocking)"}</p>
          </>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface-card p-4">
        <h2 className="font-semibold mb-2">Cron Jobs {stale ? "(cached)" : ""}</h2>
        {loading ? (
          <p className="text-white/60 text-sm">Memuat data...</p>
        ) : jobs.length === 0 ? (
          <p className="text-white/60 text-sm">Belum ada data cron (cek gateway/CLI).</p>
        ) : (
          <ul className="space-y-2 text-sm text-white/80">
            {jobs.map((j) => (
              <li key={j.id}>- {j.name ?? j.id} {j.enabled === false ? "(disabled)" : ""}</li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
