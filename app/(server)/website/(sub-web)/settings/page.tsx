"use client";

import { useEffect, useState } from "react";

type Overview = {
  hostname: string;
  nginxSiteCount: number;
  failedUnits: string[];
  memory: {
    swapTotalMb: number;
    swapUsedMb: number;
  };
  disks: Array<{
    mount: string;
    usedPercent: number;
  }>;
};

export default function SettingsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/server/overview", { cache: "no-store" });
        const payload = await response.json();
        if (cancelled) return;
        setOverview(payload.overview);
        setError(payload.ok ? "" : payload.error || "Failed to load settings.");
      } catch {
        if (!cancelled) setError("Failed to load settings.");
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const rootDisk = overview?.disks.find((disk) => disk.mount === "/") ?? overview?.disks[0];
  const swapUsedPercent =
    overview && overview.memory.swapTotalMb
      ? (overview.memory.swapUsedMb / overview.memory.swapTotalMb) * 100
      : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-manrope font-medium text-white">
          Settings
        </h1>
        <p className="text-white/50 font-ibm-plex-mono text-sm uppercase tracking-widest">
          Read-only operational thresholds and monitoring context
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface-card p-1">
          <div className="px-4 py-2.5 text-sm font-manrope text-white">
            Monitoring Context
          </div>
          <div className="rounded-[10px] bg-surface p-4 space-y-4">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-white/40 font-ibm-plex-mono">
                Server Hostname
              </div>
              <div className="mt-2 text-white font-ibm-plex-mono">
                {overview?.hostname || "-"}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-widest text-white/40 font-ibm-plex-mono">
                Active Nginx Sites
              </div>
              <div className="mt-2 text-white font-ibm-plex-mono">
                {overview?.nginxSiteCount ?? "-"}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-widest text-white/40 font-ibm-plex-mono">
                Failed Units
              </div>
              <div className="mt-2 text-white font-ibm-plex-mono">
                {overview?.failedUnits.length ?? 0}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface-card p-1">
          <div className="px-4 py-2.5 text-sm font-manrope text-white">
            Warning Thresholds
          </div>
          <div className="rounded-[10px] bg-surface p-4 space-y-4">
            <div className="rounded-xl border border-border bg-surface-card px-4 py-3">
              <div className="text-[11px] uppercase tracking-widest text-white/40 font-ibm-plex-mono">
                Disk Warning
              </div>
              <div className="mt-2 text-white font-ibm-plex-mono">
                {rootDisk ? `${rootDisk.usedPercent}% used on /` : "-"}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-surface-card px-4 py-3">
              <div className="text-[11px] uppercase tracking-widest text-white/40 font-ibm-plex-mono">
                Swap Warning
              </div>
              <div className="mt-2 text-white font-ibm-plex-mono">
                {overview
                  ? `${swapUsedPercent.toFixed(1)}% used`
                  : "-"}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-surface-card px-4 py-3">
              <div className="text-[11px] uppercase tracking-widest text-white/40 font-ibm-plex-mono">
                Current Policy
              </div>
              <div className="mt-2 text-white/70 text-sm font-manrope">
                This dashboard is currently read-only. Monitoring and inventory are live, but restart, deploy, and config mutation actions are not enabled yet.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
