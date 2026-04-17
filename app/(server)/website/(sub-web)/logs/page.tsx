"use client";

import { useEffect, useState } from "react";

type LogsPayload = {
  nginxErrors: string[];
  failedUnits: string[];
  unhealthyContainers: Array<{
    name: string;
    status: string;
    ports: string;
  }>;
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogsPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/server/logs", { cache: "no-store" });
        const payload = await response.json();
        if (cancelled) return;
        setLogs(payload.logs);
        setError(payload.ok ? "" : payload.error || "Failed to load logs.");
      } catch {
        if (!cancelled) setError("Failed to load logs.");
      }
    };
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-manrope font-medium text-white">Logs</h1>
        <p className="text-white/50 font-ibm-plex-mono text-sm uppercase tracking-widest">
          Recent nginx errors, failed units, and unhealthy containers
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-border bg-surface-card p-1">
          <div className="px-4 py-2.5 text-sm font-manrope text-white">
            Nginx Error Log
          </div>
          <div className="rounded-[10px] bg-surface p-4">
            <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap text-xs leading-6 text-white/80 font-ibm-plex-mono">
              {logs?.nginxErrors.join("\n") || "No recent nginx errors."}
            </pre>
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-2xl border border-border bg-surface-card p-1">
            <div className="px-4 py-2.5 text-sm font-manrope text-white">
              Failed Units
            </div>
            <div className="rounded-[10px] bg-surface p-4">
              {logs?.failedUnits.length ? (
                <div className="space-y-2">
                  {logs.failedUnits.map((unit) => (
                    <div
                      key={unit}
                      className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 font-ibm-plex-mono"
                    >
                      {unit}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs uppercase tracking-widest text-emerald-300 font-ibm-plex-mono">
                  No failed units
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface-card p-1">
            <div className="px-4 py-2.5 text-sm font-manrope text-white">
              Unhealthy Containers
            </div>
            <div className="rounded-[10px] bg-surface p-4">
              {logs?.unhealthyContainers.length ? (
                <div className="space-y-3">
                  {logs.unhealthyContainers.map((container) => (
                    <div
                      key={container.name}
                      className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-3"
                    >
                      <div className="font-manrope text-white">{container.name}</div>
                      <div className="mt-1 text-xs text-white/70 font-ibm-plex-mono">
                        {container.status}
                      </div>
                      {container.ports && (
                        <div className="mt-1 text-xs text-white/40 font-ibm-plex-mono">
                          {container.ports}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs uppercase tracking-widest text-emerald-300 font-ibm-plex-mono">
                  No unhealthy containers
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
