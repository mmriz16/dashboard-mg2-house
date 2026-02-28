"use client";

import { useEffect, useState } from "react";

type Row = { id: string; status?: string; model?: string; kind: "agent" | "subagent" };

export default function AgentSessionsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        const [a, s] = await Promise.all([
          fetch("/api/control-center/agents", { cache: "no-store" }),
          fetch("/api/control-center/subagents", { cache: "no-store" }),
        ]);

        const ad = a.ok ? await a.json() : [];
        const sd = s.ok ? await s.json() : [];

        if (!cancelled) {
          setRows([
            ...(Array.isArray(ad) ? ad.map((x: any) => ({ ...x, kind: "agent" as const })) : []),
            ...(Array.isArray(sd) ? sd.map((x: any) => ({ ...x, kind: "subagent" as const })) : []),
          ]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="text-white space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Agent Sessions</h1>
        <p className="text-white/60 mt-1">Daftar agent/subagent aktif.</p>
      </div>

      <div className="rounded-xl border border-border bg-surface-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-hover text-white/70">
            <tr>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">ID</th>
              <th className="text-left px-4 py-3">Model</th>
              <th className="text-left px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-4 text-white/60" colSpan={4}>Memuat data...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="px-4 py-4 text-white/60" colSpan={4}>Belum ada data (cek gateway/API).</td></tr>
            ) : rows.map((r) => (
              <tr key={`${r.kind}-${r.id}`} className="border-t border-border">
                <td className="px-4 py-3 uppercase text-xs text-white/60">{r.kind}</td>
                <td className="px-4 py-3">{r.id}</td>
                <td className="px-4 py-3 text-white/70">{r.model ?? "-"}</td>
                <td className="px-4 py-3">{r.status ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
